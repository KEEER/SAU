class InternalError {
  constructor(type, data, extra) {
    this.type = type;
    this.data = data;
    this.extra = extra;
    return;
  }
}

InternalError.HTTP_ERROR = "HTTP_ERROR";
InternalError.INTERNAL_REDIRECT = "INTERNAL_REDIRECT";
InternalError.REDIRECT = "REDIRECT";

const redirect = url => new InternalError(InternalError.REDIRECT, url),
      httpError = (code, text) => new InternalError(InternalError.HTTP_ERROR, code, text),
      internalRedirect = (url, extra) => new InternalError(InternalError.INTERNAL_REDIRECT, url, extra);

module.exports = {
  InternalError,
  redirect,
  httpError,
  internalRedirect
};
