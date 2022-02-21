const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const fs = require('fs')

const TOOL_NAME = 'mold'

const checkOs = () => {
    switch (process.platform) {
        case 'win32':
        case 'darwin':
            throw new Error(`${process.platform} runners are not supported`)
        default:
            return 'linux'
    }
}

const findInCache = (manifest) => {
    const dir = tc.find(TOOL_NAME, manifest.version);
    if (dir && dir.length > 0) {
        return dir;
    } else {
        return null;
    }
}

const unpack = async (filename, path) => {
    if (/\.tar\.gz$/.test(filename)) return tc.extractTar(path)
    if (/\.zip$/.test(filename)) return tc.extractZip(path)
    throw Error(`Unknown archive type: ${filename}`)
}

const download = async (manifest) => {
    if (manifest.files.length === 0) throw Error(`Error in manifest file: can not find files`)

    const file = manifest.files[0]
    const moldArchive = await tc.downloadTool(file.download_url)
    const moldUnzipped = await unpack(file.filename, moldArchive)
    const bin = `${moldUnzipped}/${file.strip_prefix}/bin`
    return tc.cacheDir(bin, TOOL_NAME, TOOL_NAME, manifest.version)
}

const tryMakeDefault = async (mold, bin) => {
    try { await io.cp(mold, `/usr/bin/ld`); return; } catch (e) {/* ignore */ }
    try { await io.cp(mold, `/usr/local/bin/ld`); return; } catch (e) {/* ignore */ }
    try { await io.cp(mold, `${bin}/ld`); return; } catch (e) {/* ignore */ }

    core.warning("Was not able to set `mold` as default...")
}

const findReleaseFromManifest = async (
    semanticVersionSpec,
    architecture
) => {
    let manifest;
    if(fs.existsSync('versions-manifest.json')) {
        manifest = JSON.parse(fs.readFileSync('versions-manifest.json', 'utf8'))
    } else {
        manifest = await tc.getManifestFromRepo(
            /*owner=*/'Warchant',
            /*repo=*/'setup-mold'
        )
    }
    return await tc.findFromManifest(
        semanticVersionSpec,
        false,
        manifest,
        architecture
    );
}

const run = async () => {
    try {
        checkOs();

        const version = core.getInput('version', { required: false }) || '1.1.0'
        const manifest = await findReleaseFromManifest(version, 'x64')
        if (!manifest) {
            core.setFailed(`Can not find version ${version} in https://github.com/Warchant/setup-mold/blob/main/versions-manifest.json file`)
        }

        let bin = findInCache(manifest);
        if (!bin) {
            core.info(`can not find mold ${manifest.version} in cache... downloading`)
            bin = await download(manifest);
        }

        const mold = `${bin}/mold`
        const make_default = core.getInput('make_default', { required: false }) || false;
        if (make_default) {
            await tryMakeDefault(mold, bin)
        }

        core.addPath(bin);
    } catch (err) {
        // setFailed logs the message and sets a failing exit code
        core.setFailed(err.message);
    }
}

run();