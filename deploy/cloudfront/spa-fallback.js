// CloudFront Function — runtime cloudfront-js-2.0 — event: viewer-request.
// Attach ONLY to the default behavior (* -> private S3 bucket), never to /api/*:
// API responses (401, 404, 503...) must reach the browser untouched.
//
// Angular routes (/feed, /debates/<id>, /messages/<id>...) have no file extension and do not
// exist in the bucket: they are rewritten to /index.html so a direct open or refresh works.
// Build files (main-HASH.js, styles-HASH.css, favicon.ico...) have an extension and pass through.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.lastIndexOf('.') > uri.lastIndexOf('/')) {
    return request;
  }

  request.uri = '/index.html';
  return request;
}
