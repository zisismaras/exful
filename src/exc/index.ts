const {writeFileSync, mkdirSync, existsSync} = require("fs");
const pathResolve = require("path").resolve;
const chalk = require("chalk");
const templates = require("./templates");
const pkg = require("../../package.json");

const VALID_NAME = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

printHeader();

const args = process.argv.slice(2);
if (!existsSync(pathResolve(process.cwd(), "package.json"))) {
    exitWithError("exc should be run in the root project directory");
}

switch (args[0]) {
case "add":
    initializeExfulDir();
    const moduleName = args[1];
    checkModule(moduleName);
    addModule(moduleName);
    break;
case "help":
    helpMessage();
    break;
default:
    helpMessage();
    break;
}

function printHeader() {
    console.log(chalk.cyan.bold("exc - exful CLI helper"));
    console.log(chalk.cyan.bold("version:", pkg.version), "\n");
}

function helpMessage() {
    console.log("usage:", "exc add moduleName");
}

function exitWithError(message: string) {
    console.error(chalk.red("exc error:"), message);
    process.exit(1);
}

function initializeExfulDir() {
    if (!existsSync("./exful")) {
        mkdirSync("./exful");
    }
}

function checkModule(moduleName: string) {
    if (!moduleName) {
        exitWithError("The add command needs a module name");
    }
    if (!VALID_NAME.test(moduleName)) {
        exitWithError(`Module name (${moduleName}) is not a valid javascript variable name`);
    }
    if (existsSync(pathResolve("./exful", moduleName))) {
        exitWithError(`Module "${moduleName}" already exists`);
    }
}

function addModule(moduleName: string) {
    const modulePath = pathResolve("./exful", moduleName);
    console.log(chalk.cyan("module:"), moduleName);
    mkdirSync(modulePath);
    console.log(chalk.cyan("create:"), `${modulePath}/index.ts`);
    writeFileSync(`${modulePath}/index.ts`, templates.indexTemplate(moduleName), "utf-8");
    console.log(chalk.cyan("create:"), `${modulePath}/state.ts`);
    writeFileSync(`${modulePath}/state.ts`, templates.stateTemplate(), "utf-8");
    console.log(chalk.cyan("create:"), `${modulePath}/mutations.ts`);
    writeFileSync(`${modulePath}/mutations.ts`, templates.mutationsTemplate(), "utf-8");
    console.log(chalk.cyan("create:"), `${modulePath}/actions.ts`);
    writeFileSync(`${modulePath}/actions.ts`, templates.actionsTemplate(), "utf-8");
    console.log(chalk.cyan("create:"), `${modulePath}/getters.ts`);
    writeFileSync(`${modulePath}/getters.ts`, templates.gettersTemplate(), "utf-8");
    console.log(`\nmodule ${moduleName} created!`, "\n");
    console.log("build nuxt with `npm run dev` or `npm run build` to load it and generate its types");
}
