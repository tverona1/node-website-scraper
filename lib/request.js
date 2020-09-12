const Promise = require('bluebird');
const got = require('got');
const logger = require('./logger');
const { extend, isPlainObject } = require('./utils');

function getMimeType (contentType) {
	return contentType ? contentType.split(';')[0] : null;
}

function defaultResponseHandler ({response}) {
	return Promise.resolve(response.body);
}

function transformResult (result) {
	switch (true) {
		case typeof result === 'string':
			return {
				body: result,
				metadata: null
			};
		case isPlainObject(result):
			return {
				body: result.body,
				metadata: result.metadata || null
			};
		case result === null:
			return null;
		default:
			throw new Error('Wrong response handler result. Expected string or object, but received ' + typeof result);
	}
}

module.exports.get = ({url, referer, options = {}, afterResponse = defaultResponseHandler}) => {
	const requestOptions = extend(options, {url});

	if (referer) {
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers.referer = referer;
	}

	logger.debug(`[request] sending request for url ${url}, referer ${referer}`);

	return got(requestOptions).then((response) => {
		logger.debug(`[request] received response for ${response.url}, statusCode ${response.statusCode}`);
		return afterResponse({response, url})
			.then(transformResult)
			.then((responseHandlerResult) => {
				if (!responseHandlerResult) {
					return null;
				}
				return {
					url: response.url,
					mimeType: getMimeType(response.headers['content-type']),
					body: responseHandlerResult.body,
					metadata: responseHandlerResult.metadata
				};
			});
	});
};
