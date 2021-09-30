import fetch from 'node-fetch';
import * as registryAuthToken from 'registry-auth-token';
import * as semver from 'semver';

/**
 * 
 * @param {*} packageName = NPM Package name, should be string
 * @param {*} version     = NPM Package version, should be string
 */
export default async function versionCheck(packageName: string, version?: string) {
  const npmRegistryURL = 'https://registry.npmjs.org';
  const auth = registryAuthToken(npmRegistryURL, {recursive: true});

  const headers = {
    'accept': '*/*',
    'content-type': 'application/json',
  }

  if (!!auth) {
    headers['authorization'] = `${auth.type} ${auth.token}`;
  }

  try {
    version = (!!version && typeof(version) === 'string') ? version : 'latest';
    packageName = packageName.toLowerCase();

    if (
      !(semver.maxSatisfying(
        [version],
        '*',
        {
          includePrerelease: true
        }
      ))
    ) {
      throw new Error(`Version ${version} is invalid, should using semver`);
    }

    const response = await fetch(
      `${npmRegistryURL}/${packageName}/${version}`,
      {
        headers,
        method: 'GET'
      }
    );

    let latestResponse = null;
    if (version !== 'latest') {
      latestResponse = await fetch(
        `${npmRegistryURL}/${packageName}/latest`,
        {
          headers,
          method: 'GET'
        }
      );
    } else {
      latestResponse = response;
    }

    const responseData = {
      requestVerison: await response.json(),
      latestVersion: null
    };
    const responseStatus = {
      requestVersion: parseInt(response.status, 0),
      latestVersion: null
    };

    responseData.latestVersion = await latestResponse.json();
    responseStatus.latestVersion = parseInt(latestResponse.status, 0);

    if (
      (
        responseStatus.requestVersion >= 200 &&
        responseStatus.requestVersion < 300
      ) || responseStatus.requestVersion === 404
    ) {
      return {
        status: 'success',
        data: {
          exists: (responseStatus.requestVersion === 404) ? false : true,
          latestVersion: (responseStatus.latestVersion === 404) ? '0.0.0' : responseData.latestVersion.version
        }
      };
    } else {
      throw new Error(`Response error: ${responseData.requestVerison}`);
    }
  } catch (error) {
    return {
      status: 'error',
      message: error
    }
  }
};