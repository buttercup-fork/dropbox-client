import { expect } from "chai";
import sinon from "sinon";
import { Layerr } from "layerr";
import { DropboxClient } from "../../dist/client.js";

const TOKEN = "secret-token-123";

async function captureError(callback) {
    try {
        await callback();
    } catch (err) {
        return err;
    }
    return null;
}

function entry(name) {
    return {
        ".tag": "file",
        id: `id:${name}`,
        name,
        path_display: `/${name}`,
        size: 1
    };
}

describe("Review fixes", function() {
    describe("B-632: error info leaves out the query string", function() {
        [{}, { compat: true }].forEach(clientConfig => {
            it(`has no token in info.url (config ${JSON.stringify(clientConfig)})`, async function() {
                const client = new DropboxClient(TOKEN, clientConfig);
                client.patcher.patch("request", async () => ({
                    ok: false,
                    status: 400,
                    statusText: "Bad Request",
                    // The final URL as fetch reports it in compat mode
                    url: `https://api.dropboxapi.com/2/files/get_metadata?authorization=Bearer%20${TOKEN}&reject_cors_preflight=true#x`
                }));
                const error = await captureError(() => client.getInfo("/a.bcup"));
                const info = Layerr.info(error);
                expect(info.url).to.equal("https://api.dropboxapi.com/2/files/get_metadata");
                expect(JSON.stringify(info)).to.not.contain(TOKEN);
            });
        });
    });

    describe("B-633: directory listing follows the cursor", function() {
        [
            [{}, "headers.Authorization"],
            [{ compat: true }, "query.authorization"]
        ].forEach(([clientConfig, authPath]) => {
            describe(`config ${JSON.stringify(clientConfig)}`, function() {
                beforeEach(function() {
                    this.client = new DropboxClient(TOKEN, clientConfig);
                    this.request = sinon.stub();
                    this.request.onCall(0).resolves({
                        ok: true,
                        json: async () => ({ entries: [entry("a")], cursor: "cursor-1", has_more: true })
                    });
                    this.request.onCall(1).resolves({
                        ok: true,
                        json: async () => ({ entries: [entry("b")], cursor: "cursor-2", has_more: true })
                    });
                    this.request.onCall(2).resolves({
                        ok: true,
                        json: async () => ({ entries: [entry("c")], cursor: "cursor-3", has_more: false })
                    });
                    this.client.patcher.patch("request", (...args) => this.request(...args));
                });

                it("returns the entries of every page", async function() {
                    const items = await this.client.getDirectoryContents("/folder");
                    expect(items.map(item => item.name)).to.deep.equal(["a", "b", "c"]);
                    expect(this.request.callCount).to.equal(3);
                });

                it("sends the cursor to list_folder/continue with the token", async function() {
                    await this.client.getDirectoryContents("/folder");
                    const second = this.request.secondCall.args[0];
                    const third = this.request.thirdCall.args[0];
                    expect(second.url).to.equal("https://api.dropboxapi.com/2/files/list_folder/continue");
                    expect(JSON.parse(second.body)).to.deep.equal({ cursor: "cursor-1" });
                    expect(JSON.parse(third.body)).to.deep.equal({ cursor: "cursor-2" });
                    expect(second).to.have.nested.property(authPath, `Bearer ${TOKEN}`);
                });
            });
        });

        it("fails when more entries are announced without a cursor", async function() {
            const client = new DropboxClient(TOKEN);
            client.patcher.patch("request", async () => ({
                ok: true,
                json: async () => ({ entries: [entry("a")], has_more: true })
            }));
            const error = await captureError(() => client.getDirectoryContents("/folder"));
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/no cursor/);
        });

        it("stops after 1000 pages", async function() {
            const client = new DropboxClient(TOKEN);
            const request = sinon.stub().callsFake(async () => ({
                ok: true,
                json: async () => ({ entries: [], cursor: "again", has_more: true })
            }));
            client.patcher.patch("request", request);
            const error = await captureError(() => client.getDirectoryContents("/folder"));
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/Too many directory pages/);
            expect(request.callCount).to.equal(1000);
        });
    });

    describe("B-634: requests time out", function() {
        beforeEach(function() {
            this.originalFetch = globalThis.fetch;
            this.calls = [];
            // A server that never answers: the promise only ends on abort
            globalThis.fetch = (url, options = {}) =>
                new Promise((resolve, reject) => {
                    this.calls.push({ url, options });
                    if (options.signal) {
                        options.signal.addEventListener("abort", () => reject(new Error("aborted")));
                    }
                });
        });

        afterEach(function() {
            globalThis.fetch = this.originalFetch;
        });

        it("aborts a metadata request after `timeout`", async function() {
            const client = new DropboxClient(TOKEN, { timeout: 20, contentTimeout: 60000 });
            const started = Date.now();
            const error = await captureError(() => client.getInfo("/a.bcup"));
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/aborted/);
            expect(Date.now() - started).to.be.below(2000);
        });

        it("aborts a download after `contentTimeout`", async function() {
            const client = new DropboxClient(TOKEN, { timeout: 60000, contentTimeout: 20 });
            const error = await captureError(() => client.getFileContents("/a.bcup"));
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/aborted/);
        });

        it("aborts an upload after `contentTimeout`", async function() {
            const client = new DropboxClient(TOKEN, { timeout: 60000, contentTimeout: 20 });
            const error = await captureError(() => client.putFileContents("/a.bcup", "data"));
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/aborted/);
        });

        it("applies the content limit to a request made through the patcher (core's attachment download)", async function() {
            const client = new DropboxClient(TOKEN, { timeout: 60000, contentTimeout: 20 });
            const error = await captureError(() =>
                client.patcher.execute("request", {
                    method: "GET",
                    url: "https://content.dropboxapi.com/2/files/download",
                    headers: {},
                    query: {}
                })
            );
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.match(/aborted/);
        });

        it("defaults to 60 seconds for metadata and 10 minutes for content", async function() {
            const clock = sinon.useFakeTimers();
            try {
                const client = new DropboxClient(TOKEN);
                const info = captureError(() => client.getInfo("/a.bcup"));
                const download = captureError(() => client.getFileContents("/a.bcup"));
                await clock.tickAsync(0);
                expect(this.calls).to.have.lengthOf(2);
                const [infoSignal, downloadSignal] = this.calls.map(call => call.options.signal);
                expect(infoSignal).to.be.an.instanceOf(AbortSignal);
                expect(downloadSignal).to.be.an.instanceOf(AbortSignal);
                await clock.tickAsync(59999);
                expect(infoSignal.aborted).to.equal(false);
                await clock.tickAsync(1);
                expect(infoSignal.aborted).to.equal(true);
                expect((await info).message).to.match(/aborted/);
                await clock.tickAsync(10 * 60 * 1000 - 60000 - 1);
                expect(downloadSignal.aborted).to.equal(false);
                await clock.tickAsync(1);
                expect(downloadSignal.aborted).to.equal(true);
                expect((await download).message).to.match(/aborted/);
            } finally {
                clock.restore();
            }
        });

        it("sends no signal when both limits are 0", async function() {
            const client = new DropboxClient(TOKEN, { timeout: 0, contentTimeout: 0 });
            client.getInfo("/a.bcup").catch(() => {});
            client.getFileContents("/a.bcup").catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(this.calls).to.have.lengthOf(2);
            this.calls.forEach(call => expect(call.options.signal).to.equal(undefined));
        });

        it("clears the timer once the response arrives", async function() {
            globalThis.fetch = async (url, options) => {
                this.calls.push({ url, options });
                return {
                    ok: true,
                    status: 200,
                    statusText: "OK",
                    json: async () => ({ ".tag": "file", id: "id:a", name: "a.bcup", path_display: "/a.bcup", size: 1 })
                };
            };
            const client = new DropboxClient(TOKEN, { timeout: 20 });
            await client.getInfo("/a.bcup");
            await new Promise(resolve => setTimeout(resolve, 60));
            expect(this.calls[0].options.signal.aborted).to.equal(false);
        });
    });
});
