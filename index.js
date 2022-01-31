const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');

const TOOL_NAME = 'mold'

const checkOs = () => {
    switch (process.platform) {
        case 'win32':
            throw new Error(`Windows runner is not supported`)
        case 'darwin':
            return 'macosx'
        default:
            return 'linux'
    }
}

const findInCache = (version) => {
    console.log(version)
    const dir = tc.find(TOOL_NAME, version);
    if (dir && dir.length > 0) {
        return dir;
    } else {
        return null;
    }
}

const downloadAndBuild = async (version) => {
    const url = `https://github.com/rui314/mold/archive/refs/tags/${version}.zip`
    const moldZip = await tc.downloadTool(url)
    const moldUnzipped = await tc.extractZip(moldZip)
    const out = await exec.getExecOutput(`ls ${moldUnzipped}`)
    if (out.exitCode !== 0) {
        throw new Error(`Can't strip path: ${out}`)
    }
    const path = `${moldUnzipped}/${out.stdout.trim()}`
    exec.exec(`make -j2 CXX=clang++ CC=clang -C ${path}`)
    const cachedPath = await tc.cacheDir(path, TOOL_NAME, version);
    return cachedPath
}

const run = async () => {
    try {
        checkOs();
        const version = core.getInput('version', { required: true });
        let bin = findInCache(version);
        if (!bin) {
            bin = await downloadAndBuild(version);
        }
        core.addPath(bin);
    } catch (err) {
        // setFailed logs the message and sets a failing exit code
        core.setFailed(err.message);
    }
}

run();