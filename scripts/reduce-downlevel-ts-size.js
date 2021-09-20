const { readdirSync, readFileSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");
const stripComments = require("strip-comments");

const { packages } = JSON.parse(readFileSync(join(process.cwd(), "package.json"))).workspaces;

const getAllFiles = (dirPath, arrayOfFiles) => {
  files = readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
};

packages
  .map((dir) => dir.replace("/*", ""))
  .forEach((workspacesDir) => {
    // Process each workspace in workspace directory
    readdirSync(join(process.cwd(), workspacesDir), { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .forEach((workspaceDir) => {
        const downlevelDir = join(process.cwd(), workspacesDir, workspaceDir, "dist-types/ts3.4");
        getAllFiles(downlevelDir).forEach((filepath) => {
          const content = readFileSync(filepath, "utf8");
          writeFileSync(filepath, stripComments(content));
        });
      });
  });
