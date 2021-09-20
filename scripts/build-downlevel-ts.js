const { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } = require("fs");
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
        const downlevelTypesVersions = {};

        const typesDir = join(workspaceDirPath, distTypesFolder);
        const downlevelTypesDir = join(workspaceDirPath, distTypesFolder, downlevelTypesFolder);
        getAllFiles(downlevelTypesDir).forEach((downlevelTypesFilepath) => {
          const fileName = downlevelTypesFilepath.replace(downlevelTypesDir, "");
          const typesFilepath = join(typesDir, fileName);
          const { status } = spawnSync("diff", ["--strip-trailing-cr", typesFilepath, downlevelTypesFilepath]);
          if (status === 0) {
            // remove file from downlevelTypesFilepath
            unlinkSync(downlevelTypesFilepath);
          } else {
            // Add file version to be updated in package.json
            downlevelTypesVersions[join(distTypesFolder, fileName)] = join(
              distTypesFolder,
              downlevelTypesFolder,
              fileName
            );
            // Strip comments from downlevel-dts file
            const content = readFileSync(downlevelTypesFilepath, "utf8");
            writeFileSync(downlevelTypesFilepath, stripComments(content));
          }
        });

        const packageManifestPath = join(workspaceDirPath, "package.json");
        const packageManifest = JSON.parse(readFileSync(packageManifestPath).toString());
        packageManifest.typesVersions["<4.0"] = downlevelTypesVersions;
        writeFileSync(packageManifestPath, JSON.stringify(packageManifest, null, 2).concat(`\n`));
      });
  });
