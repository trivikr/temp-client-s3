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
        const downlevelDirname = "ts3.4";

        const tsTypesConfigPath = join(workspaceDir, "tsconfig.types.json");
        const declarationDirname = JSON.parse(readFileSync(tsTypesConfigPath).toString()).compilerOptions
          .declarationDir;

        if (!declarationDirname) {
          throw new Error(`The declarationDir is not defined in "${tsTypesConfigPath}".`);
        }

        const declarationDir = join(workspaceDir, declarationDirname);
        if (!existsSync(declarationDir)) {
          throw new Error(
            `The types for "${workspaceName}" do not exist.\n` +
              `Please build types for workspace "${workspaceDir}" before running downlevel-dts script.`
          );
        }

        const downlevelDir = join(declarationDir, downlevelDirname);
        // Create downlevel-dts folder if it doesn't exist
        if (!existsSync(downlevelDir)) {
          execSync(["./node_modules/.bin/downlevel-dts", declarationDir, downlevelDir].join(" "));
        }

        // Process downlevel-dts folder if it exists
        if (existsSync(downlevelDir)) {
          // Add typesVersions in package.json
          const packageJsonPath = join(workspaceDir, "package.json");
          const packageJson = JSON.parse(readFileSync(packageJsonPath).toString());
          packageJson.typesVersions = {
            "<4.0": {
              [`${declarationDirname}/*`]: [`${declarationDirname}/${downlevelDirname}/*`],
            },
          };
          writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2).concat(`\n`));

          getAllFiles(downlevelDir).forEach((downlevelTypesFilepath) => {
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
