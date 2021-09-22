const { existsSync, readdirSync, readFileSync, statSync, writeFileSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");
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
      .forEach((workspaceName) => {
        const workspaceDir = join(workspacesDir, workspaceName);
        const distTypesFolder = "dist-types";
        const downlevelTypesFolder = "ts3.4";

        const workspaceDistTypesFolder = join(workspaceDir, distTypesFolder);
        if (!existsSync(workspaceDistTypesFolder)) {
          throw new Error(
            `The types for "${workspaceName}" do not exist.\n` +
              `Either "yarn build:types" is not run in workspace "${workspaceDir}" or` +
              `types are not emitted in "${distTypesFolder}" folder.`
          );
        }

        const workspaceDistTypesDownlevelFolder = join(workspaceDistTypesFolder, downlevelTypesFolder);
        // Create downlevel-dts folder if it doesn't exist
        if (!existsSync(workspaceDistTypesDownlevelFolder)) {
          execSync(
            [
              "./node_modules/.bin/downlevel-dts",
              workspaceDistTypesFolder,
              join(workspaceDistTypesFolder, downlevelTypesFolder),
            ].join(" ")
          );
        }

        // Process downlevel-dts folder if it exists
        if (existsSync(workspaceDistTypesDownlevelFolder)) {
          const downlevelTypesDir = join(workspaceDir, distTypesFolder, downlevelTypesFolder);

          // Add typesVersions in package.json
          const packageManifestPath = join(workspaceDir, "package.json");
          const packageManifest = JSON.parse(readFileSync(packageManifestPath).toString());
          packageManifest.typesVersions = {
            "<4.0": {
              [`${distTypesFolder}/*`]: [`${distTypesFolder}/${downlevelTypesFolder}/*`],
            },
          };
          writeFileSync(packageManifestPath, JSON.stringify(packageManifest, null, 2).concat(`\n`));

          getAllFiles(downlevelTypesDir).forEach((downlevelTypesFilepath) => {
            // Strip comments from downlevel-dts file
            try {
              const content = readFileSync(downlevelTypesFilepath, "utf8");
              writeFileSync(downlevelTypesFilepath, stripComments(content));
            } catch (error) {
              console.error(
                `Error while stripping comments from "${downlevelTypesFilepath.replace(process.cwd(), "")}"`
              );
              console.error(error);
            }
          });
        }
      });
  });
