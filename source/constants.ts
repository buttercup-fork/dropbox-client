export const DROPBOX_DOMAIN = "dropbox.com";

/**
 * Host of the upload and download endpoints
 */
export const CONTENT_HOST = "content.dropboxapi.com";

/**
 * Default time limit for uploads and downloads (they carry whole vaults and
 * attachments; a single upload can be up to 150 MB)
 */
export const CONTENT_TIMEOUT = 10 * 60 * 1000;

/**
 * Stop following the listing cursor after this many pages
 */
export const MAX_DIRECTORY_PAGES = 1000;

/**
 * Default time limit for every other request
 */
export const REQUEST_TIMEOUT = 60 * 1000;
