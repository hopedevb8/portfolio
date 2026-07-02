#!/usr/bin/env node

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const command = process.argv[2];
const args = process.argv.slice(2);

if(!command)
{
    console.error('Missing Gatsby command')
    process.exit(1)
}

const sharedGraphqlDir = path.join(rootDir, 'node_modules', 'gatsby', 'node_modules', 'graphql');
const graphqlLinks = [
    path.join(rootDir, 'node_modules', 'graphql'),
    path.join(rootDir, 'node_modules', 'gatsby-recipes', 'node_modules', 'graphql')
];
const postcssPackageJsonPath = path.join(rootDir, 'node_modules', 'postcss', 'package.json');

const ensureDir = (_path) =>
{
    fs.mkdirSync(_path, { recursive: true });
};

const replaceWithSymlink = (_linkPath, _targetPath) =>
{
    ensureDir(path.dirname(_linkPath));

    if(fs.existsSync(_linkPath))
    {
        const sameTarget = (() =>
        {
            try
            {
                return fs.realpathSync(_linkPath) === fs.realpathSync(_targetPath);
            }
            catch
            {
                return false;
            }
        })();

        if(sameTarget)
        {
            return;
        }

        fs.rmSync(_linkPath, { recursive: true, force: true });
    }

    const relativeTarget = path.relative(path.dirname(_linkPath), _targetPath);
    fs.symlinkSync(relativeTarget, _linkPath, 'dir');
};

const patchPostcssPackageExports = () =>
{
    if(!fs.existsSync(postcssPackageJsonPath))
    {
        return;
    }

    const postcssPackageJson = JSON.parse(fs.readFileSync(postcssPackageJsonPath, 'utf8'));
    const exportsMap = postcssPackageJson.exports || {};

    if(exportsMap['./package.json'])
    {
        return;
    }

    exportsMap['./package.json'] = './package.json';
    postcssPackageJson.exports = exportsMap;

    fs.writeFileSync(postcssPackageJsonPath, `${JSON.stringify(postcssPackageJson, null, 2)}\n`);
};

if(!fs.existsSync(sharedGraphqlDir))
{
    console.error(`Missing shared graphql directory: ${sharedGraphqlDir}`);
    process.exit(1);
}

for(const linkPath of graphqlLinks)
{
    replaceWithSymlink(linkPath, sharedGraphqlDir);
}

patchPostcssPackageExports();

const configHome = path.join(rootDir, '.gatsby-config-home');
ensureDir(configHome);
const gatsbyServicesDir = path.join(configHome, 'gatsby', 'sites');
const gatsbyCacheDir = path.join(rootDir, '.cache');
const publicDir = path.join(rootDir, 'public');

const env = {
    ...process.env,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || configHome,
    GATSBY_TELEMETRY_DISABLED: process.env.GATSBY_TELEMETRY_DISABLED || '1'
};

const legacyOpenSslFlag = '--openssl-legacy-provider';
if(!env.NODE_OPTIONS?.includes(legacyOpenSslFlag))
{
    env.NODE_OPTIONS = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ${legacyOpenSslFlag}` : legacyOpenSslFlag;
}

const findAvailablePort = (_startPort) => new Promise((_resolve) =>
{
    let attempts = 0;

    const tryPort = (_port) =>
    {
        if(_port > 65535 || attempts > 50)
        {
            _resolve(String(_startPort));
            return;
        }

        attempts += 1;
        const server = net.createServer();
        server.unref();

        server.once('error', (_error) =>
        {
            if(_error && _error.code === 'EADDRINUSE')
            {
                tryPort(_port + 1);
                return;
            }

            _resolve(String(_startPort));
        });

        server.listen(_port, () =>
        {
            const { port } = server.address();
            server.close(() => _resolve(String(port)));
        });
    };

    tryPort(_startPort);
});

const run = async () =>
{
    const spawnArgs = [...args];

    if(command === 'develop')
    {
        fs.rmSync(gatsbyCacheDir, { recursive: true, force: true });
        fs.rmSync(publicDir, { recursive: true, force: true });

        ensureDir(configHome);
        fs.rmSync(gatsbyServicesDir, { recursive: true, force: true });
        env.RECIPES_DEV_MODE = env.RECIPES_DEV_MODE || '1';
        env.HOST = env.HOST || '127.0.0.1';
        env.PORT = env.PORT || await findAvailablePort(9000);

        if(!spawnArgs.includes('--host') && !spawnArgs.includes('-H'))
        {
            spawnArgs.push('--host', env.HOST);
        }

        if(!spawnArgs.includes('--port') && !spawnArgs.includes('-p'))
        {
            spawnArgs.push('--port', env.PORT);
        }
    }

    const binName = process.platform === 'win32' ? 'gatsby.cmd' : 'gatsby';
    const binPath = path.join(rootDir, 'node_modules', '.bin', binName);

    const child = spawn(binPath, spawnArgs, {
        cwd: rootDir,
        env,
        stdio: 'inherit'
    });

    child.on('exit', (_code, _signal) =>
    {
        if(_signal)
        {
            process.kill(process.pid, _signal);
            return;
        }

        process.exit(_code ?? 1);
    });
};

run().catch((_error) =>
{
    console.error(_error);
    process.exit(1);
});
