const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const io = require('@actions/io');
const semver = require('semver')

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
    const dir = tc.find(TOOL_NAME, sanitizeVersion(version));
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


const isCommit = (str) => {
    return /[a-fA-F0-9]{32}/.test(str)
}

const getUrl = (version) => {
    if(isCommit(version)) {
        return `https://github.com/rui314/mold/archive/${version}.zip`
    } else {
        return `https://github.com/rui314/mold/archive/refs/tags/${version}.zip`
    }
}

const downloadAndBuild = async (version) => {
    const url = getUrl(version)
    const moldZip = await tc.downloadTool(url)
    const moldUnzipped = await tc.extractZip(moldZip)
    const stripPrefix = await getStripPrefix(moldUnzipped)
    const path = `${moldUnzipped}/${stripPrefix}`

    if (0 !== await exec.exec(`make -j CC=clang CXX=clang++`, [], { cwd: path })) {
        throw new Error(`Can not build mold`)
    }

    const cachedDir = await tc.cacheFile(`${path}/mold`, TOOL_NAME, TOOL_NAME, sanitizeVersion(version))
    return cachedDir
}

const sanitizeVersion = (version) => {
    if(isCommit(version)) {
        return version
    }

    // it's a tag. remove `v` prefix if it exists
    if (version.charAt(0) === 'v') {
        return version.slice(1)
    }

    return version
}

const run = async () => {
    try {
        checkOs();

        const version = core.getInput('version', { required: false })
        const cleanedVersion = semver.clean(version)
        if(!cleanedVersion || cleanedVersion !== sanitizeVersion(version)) {
            core.warning(`Tool cache will not cache this version due to https://github.com/actions/toolkit/issues/1004. Use release version.`)
        }

        let bin = findInCache(version);
        if (!bin) {
            core.info(`can not find mold ${version} in cache... downloading`)
            bin = await downloadAndBuild(version);
        }

        const mold = `${bin}/mold`

        core.info(`mold bin: ${mold}`)
        const make_default = core.getInput('default', { required: false }) || false;
        if (!make_default) {
            await io.cp(mold, `${bin}/ld`)
        }

        core.addPath(bin);
    } catch (err) {
        // setFailed logs the message and sets a failing exit code
        core.setFailed(err.message);
    }
}

run();