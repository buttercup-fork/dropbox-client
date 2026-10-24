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
});
