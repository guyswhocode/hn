const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Pass through any static assets if you add them later (e.g., images)
  eleventyConfig.addPassthroughCopy("src/assets");

  // Add CSS inline shortcode
  eleventyConfig.addShortcode("inlineCss", function (filePath) {
    const fullPath = path.join(__dirname, "src", filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf8");
    }
    console.warn(`[inlineCss] File not found: ${fullPath}`);
    return "";
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
  };
};
