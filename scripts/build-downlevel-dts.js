const { existsSync, readdirSync, readFileSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");
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
        const workspaceDirPath = join(process.cwd(), workspacesDir, workspaceDir);

        const distTypesFolder = "dist-types";
        const downlevelTypesFolder = "ts3.4";

        const workspaceDistTypesFolder = join(workspacesDir, workspaceDir, distTypesFolder);
        if (!existsSync(workspaceDistTypesFolder)) {
          console.log(`The types for ${join(workspacesDir, workspaceDir)} does not exist.`);
          console.log(`Folder checked: ${workspaceDistTypesFolder}`);
          return;
        }

        const { status: downlevelStatus, error: downlevelError } = spawnSync("./node_modules/.bin/downlevel-dts", [
          workspaceDistTypesFolder,
          join(workspaceDistTypesFolder, downlevelTypesFolder),
        ]);

        if (downlevelStatus === 0) {
          const downlevelTypesDir = join(workspaceDirPath, distTypesFolder, downlevelTypesFolder);

          // Add typesVersions in package.json
          const packageManifestPath = join(workspaceDirPath, "package.json");
          const packageManifest = JSON.parse(readFileSync(packageManifestPath).toString());
          packageManifest.typesVersions = {
            "<4.0": {
              [`${distTypesFolder}/*`]: [`${distTypesFolder}/${downlevelTypesFolder}/*`],
            },
          };
          writeFileSync(packageManifestPath, JSON.stringify(packageManifest, null, 2).concat(`\n`));

          getAllFiles(downlevelTypesDir).forEach((downlevelTypesFilepath) => {
            // Strip comments from downlevel-dts file
            const content = readFileSync(downlevelTypesFilepath, "utf8");
            writeFileSync(downlevelTypesFilepath, stripComments(content));
          });
        } else {
          console.log(`Error while calling downlevel-dts for "${workspaceDirPath}"`);
          console.log(downlevelError);
        }
      });
  });
