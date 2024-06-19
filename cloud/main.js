// Cloud Code entry point

Parse.Cloud.define("print", async (request) => {
  var wkhtmltopdf = require("wkhtmltopdf");
  return wkhtmltopdf("<h1>Test</h1><p>Hello world</p>", { output: "out.pdf" });
  // .pipe(res);
});
