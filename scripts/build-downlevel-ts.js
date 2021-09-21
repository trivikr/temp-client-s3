const { readdirSync, readFileSync, statSync, writeFileSync, rmdirSync, copyFileSync } = require("fs");
const { join, dirname, parse } = require("path");
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

const getDownlevelFileName = (fileName, downlevelIdentifier) =>
  fileName.replace(`.d.ts`, `.${downlevelIdentifier}.d.ts`);

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
        const downlevelIdentifier = "downlevel";
        const downlevelTypesVersions = {};

        const workspaceDistTypesFolder = join(workspacesDir, workspaceDir, distTypesFolder);
        const { status: downlevelStatus, error: downlevelError } = spawnSync("./node_modules/.bin/downlevel-dts", [
          workspaceDistTypesFolder,
          join(workspaceDistTypesFolder, downlevelIdentifier),
        ]);

        if (downlevelStatus === 0) {
          const typesDir = join(workspaceDirPath, distTypesFolder);
          const downlevelTypesTempDir = join(workspaceDirPath, distTypesFolder, downlevelIdentifier);

          const files = getAllFiles(downlevelTypesTempDir);

          // Copy index.d.ts and add to package.json
          files
            .filter((fileName) => fileName.endsWith("/index.d.ts"))
            .forEach((indexTempFilePath) => {
              const indexFileName = indexTempFilePath.replace(downlevelTypesTempDir, "");
              const indexNewFilePath = getDownlevelFileName(join(typesDir, indexFileName), downlevelIdentifier);
              // Copy contents of file to index.<downlevelIdentifier>.d.ts file
              copyFileSync(indexTempFilePath, indexNewFilePath);
              // Add file version to be updated in package.json
              downlevelTypesVersions[join(distTypesFolder, indexFileName)] = [
                join(distTypesFolder, getDownlevelFileName(indexFileName, downlevelIdentifier)),
              ];
            });

          const packageManifestPath = join(workspaceDirPath, "package.json");
          const packageManifest = JSON.parse(readFileSync(packageManifestPath).toString());
          packageManifest.typesVersions = { "<4.0": downlevelTypesVersions };
          writeFileSync(packageManifestPath, JSON.stringify(packageManifest, null, 2).concat(`\n`));

          files
            .filter((fileName) => !fileName.endsWith("index.d.ts"))
            .forEach((downlevelTypesTempFilepath) => {
              const fileName = downlevelTypesTempFilepath.replace(downlevelTypesTempDir, "");
              const typesFilepath = join(typesDir, fileName);

              const { status } = spawnSync("diff", ["--strip-trailing-cr", typesFilepath, downlevelTypesTempFilepath]);
              if (status !== 0) {
                // Strip comments from downlevel-dts file
                const fileContent = readFileSync(downlevelTypesTempFilepath, "utf8");
                writeFileSync(getDownlevelFileName(typesFilepath, downlevelIdentifier), stripComments(fileContent));

                // Add file to index.<downlevelIdentifier>.d.ts file
                const dirName = dirname(typesFilepath);
                const indexFilePath = getDownlevelFileName(join(dirName, "index.d.ts"), downlevelIdentifier);
                const indexContent = readFileSync(indexFilePath, "utf8");
                const { name } = parse(downlevelTypesTempFilepath);
                writeFileSync(
                  indexFilePath,
                  indexContent.replace(`${name}.d.ts`, getDownlevelFileName(`${name}.d.ts`, downlevelIdentifier))
                );
              }
            });

          rmdirSync(downlevelTypesTempDir, { recursive: true });
        } else {
          console.log(`Error while calling downlevel-dts for "${workspaceDirPath}"`);
          console.log(downlevelError);
        }
      });
  });
