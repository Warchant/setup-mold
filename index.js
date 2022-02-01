const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const io = require('@actions/io');

const TOOL_NAME = 'mold'

const checkOs = () => {
    switch (process.platform) {
        case 'win32':
            throw new Error(`Windows runners are not supported`)
        case 'darwin':
            return 'macos'
        default:
            return 'linux'
    }
}

const findInCache = (version) => {
    const dir = tc.find(TOOL_NAME, version);
    if (dir && dir.length > 0) {
        return dir;
    } else {
        return null;
    }
}

const getStripPrefix = async (moldUnzipped) => {
    const out = await exec.getExecOutput(`ls ${moldUnzipped}`)
    if (out.exitCode !== 0) {
        throw new Error(`Can't strip path: ${out}`)
    }
    return out.stdout.trimEnd()
}


const downloadAndBuild = async (version) => {
    const url = `https://github.com/rui314/mold/archive/refs/tags/${version}.zip`
    const moldZip = await tc.downloadTool(url)
    const moldUnzipped = await tc.extractZip(moldZip)
    const stripPrefix = await getStripPrefix(moldUnzipped)
    const path = `${moldUnzipped}/${stripPrefix}`

    if (0 !== await exec.exec(`make -j CC=clang CXX=clang++`, [], { cwd: path })) {
        throw new Error(`Can not build mold`)
    }

    const make_default = core.getInput('default', { required: false }) || false;
    if (!make_default) {
        // remove ld from mold dir
        await io.rmRF(`${path}/ld`)
    }
    const cachedPath = await tc.cacheDir(path, TOOL_NAME, version);
    return cachedPath
}

const run = async () => {
    try {
        const os = checkOs();
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