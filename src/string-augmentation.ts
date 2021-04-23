export { };

declare global {
  interface String {
    parseAsObject(): any;
  }
}

if (!String.prototype.parseAsObject)
  String.prototype.parseAsObject = function (): any {
    return JSON.parse(this.valueOf());
  }