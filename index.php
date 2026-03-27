<?php

declare(strict_types=1);

use Kirby\Cms\App;
use ScottBoms\LinkScanner\Scanner;
use ScottBoms\LinkScanner\ScanStore;

load([
	'ScottBoms\\LinkScanner\\Scanner' => __DIR__ . '/lib/Scanner.php',
	'ScottBoms\\LinkScanner\\ScanStore' => __DIR__ . '/lib/ScanStore.php',
]);

if (
	version_compare(App::version() ?? '0.0.0', '5.0.0', '<') === true ||
	version_compare(App::version() ?? '0.0.0', '6.0.0', '>=') === true
) {
	throw new Exception('Link Scanner requires Kirby v5');
}

function brokenLinksRequireUser(): void {
	if (kirby()->user() === null) {
		throw new Exception('Unauthorized', 401);
	}
}

function brokenLinksDetachedCommand(): string {
	$phpBinary = brokenLinksPhpBinary();
	$script = __DIR__ . '/bin/run-panel-scan.php';

	return escapeshellarg($phpBinary) . ' ' . escapeshellarg($script);
}

function brokenLinksPhpBinary(): string {
	$configured = kirby()->option('scottboms.link-scanner.phpBinary');
	$candidates = array_values(array_filter([
		is_string($configured) ? $configured : null,
		PHP_BINDIR . '/php',
		dirname(PHP_BINARY) . '/php',
		PHP_BINARY,
		'php',
	]));

	foreach ($candidates as $candidate) {
		if ($candidate === 'php') {
			return $candidate;
		}

		if (is_file($candidate) === true && is_executable($candidate) === true) {
			return $candidate;
		}
	}

	throw new Exception('Could not resolve a CLI PHP binary for the background scan.');
}

function brokenLinksStartWorker(string $scanId): void {
	if (function_exists('exec') !== true) {
		throw new Exception('PHP exec() is not available on this server.');
	}

	$command = brokenLinksDetachedCommand() . ' ' . escapeshellarg($scanId) . ' > /dev/null 2>&1 &';
	exec($command);
}

function brokenLinksTerminateWorker(int $pid): bool {
	if ($pid <= 0) {
		return false;
	}

	if (function_exists('posix_kill') === true && defined('SIGTERM') === true) {
		try {
			if (posix_kill($pid, SIGTERM) === true) {
				return true;
			}
		} catch (Throwable) {
		}
	}

	if (function_exists('exec') === true) {
		$command = 'kill ' . (int)$pid . ' > /dev/null 2>&1';
		exec($command, $output, $code);
		return $code === 0;
	}
	return false;
}

function brokenLinksAwaitWorkerStart(ScanStore $store, string $scanId): array {
	for ($attempt = 0; $attempt < 10; $attempt++) {
		usleep(200000);
		$current = $store->current();

		if (($current['id'] ?? null) !== $scanId) {
			break;
		}

		if (
			($current['workerStartedAt'] ?? null) !== null ||
			($current['processedPages'] ?? 0) > 0 ||
			($current['currentPageTitle'] ?? null) !== null ||
			($current['lastError'] ?? null) !== null ||
			($current['isRunning'] ?? false) === false
		) {
			return $current;
		}
	}

	$current = $store->current();

	if (($current['id'] ?? null) === $scanId && ($current['workerStartedAt'] ?? null) === null) {
		$current['isRunning'] = false;
		$current['lastError'] = 'The background scan worker did not start. Check the plugin phpBinary option or server exec() permissions.';
		$store->saveCurrent($current);
	}

	return $store->current();
}

function brokenLinksResponse(ScanStore $store): array {
	return [
		'current' => $store->current(),
		'latest' => $store->latest(),
	];
}

Kirby::plugin('scottboms/link-scanner', [
	'options' => [
		'timeout' => 8,
		'userAgent' => 'Kirby Link Scanner',
		'phpBinary' => null,
	],

	'areas' => [
		'link-scanner' => function () {
			if (kirby()->user() === null) {
				return [];
			}

			$store = new ScanStore(kirby());

			return [
				'label' => 'Link Scanner',
				'icon' => 'scanner',
				'breadcrumbLabel' => fn () => 'Link Scanner',
				'menu' => true,
				'link' => 'link-scanner',
				'views' => [
					[
						'pattern' => 'link-scanner',
						'action' => function () use ($store) {
							return [
								'component' => 'k-broken-links-view',
								'props' => [
								'initialLatest' => $store->latest(),
								'initialCurrent' => $store->current(),
								'startUrl' => kirby()->url('api') . '/link-scanner/start',
								'stopUrl' => kirby()->url('api') . '/link-scanner/stop',
								'completeUrl' => kirby()->url('api') . '/link-scanner/complete',
								'statusUrl' => kirby()->url('api') . '/link-scanner/status',
							],
						];
						},
					],
				],
			];
		},
	],

	'api' => [
		'routes' => [
			[
				'pattern' => 'link-scanner/start',
				'method' => 'POST',
				'action' => function () {
					try {
						brokenLinksRequireUser();

						$store = new ScanStore(kirby());
						$current = $store->current();

						if (($current['isRunning'] ?? false) === true) {
							return brokenLinksResponse($store);
						}

						$scanner = new Scanner(kirby());
						$scan = [
							'id' => bin2hex(random_bytes(16)),
							'isRunning' => true,
							'isComplete' => false,
							'cancelRequested' => false,
							'workerPid' => null,
							'startedAt' => date(DATE_ATOM),
							'finishedAt' => null,
							'stoppedAt' => null,
							'workerStartedAt' => null,
							'processedPages' => 0,
							'totalPages' => count($scanner->getPageQueue()),
							'currentPageTitle' => null,
							'lastError' => null,
						];

						$store->saveCurrent($scan);
						brokenLinksStartWorker($scan['id']);
						brokenLinksAwaitWorkerStart($store, $scan['id']);

						return brokenLinksResponse($store);
					} catch (Throwable $exception) {
						$code = (int)$exception->getCode();
						$code = $code >= 400 && $code < 600 ? $code : 500;
						throw new Exception($exception->getMessage(), $code, $exception);
					}
				},
			],
			[
				'pattern' => 'link-scanner/stop',
				'method' => 'POST',
				'action' => function () {
					try {
						brokenLinksRequireUser();

						$store = new ScanStore(kirby());
						$current = $store->current();

						if (($current['isRunning'] ?? false) === true) {
							$current['cancelRequested'] = true;
							$terminated = brokenLinksTerminateWorker((int)($current['workerPid'] ?? 0));

							if ($terminated === true) {
								$current['isRunning'] = false;
								$current['isComplete'] = false;
								$current['cancelRequested'] = false;
								$current['workerPid'] = null;
								$current['currentPageTitle'] = null;
								$current['stoppedAt'] = date(DATE_ATOM);
								$current['lastError'] = null;
							}

							$store->saveCurrent($current);
						}

						return brokenLinksResponse($store);
					} catch (Throwable $exception) {
						$code = (int)$exception->getCode();
						$code = $code >= 400 && $code < 600 ? $code : 500;
						throw new Exception($exception->getMessage(), $code, $exception);
					}
				},
			],
			[
				'pattern' => 'link-scanner/complete',
				'method' => 'POST',
				'action' => function () {
					try {
						brokenLinksRequireUser();

						$store = new ScanStore(kirby());
						$data = kirby()->request()->data();
						$store->completeResult([
							'url' => $data['url'] ?? null,
							'pageTitle' => $data['pageTitle'] ?? null,
							'panelUrl' => $data['panelUrl'] ?? null,
							'reason' => $data['reason'] ?? null,
						]);

						return brokenLinksResponse($store);
					} catch (Throwable $exception) {
						$code = (int)$exception->getCode();
						$code = $code >= 400 && $code < 600 ? $code : 500;
						throw new Exception($exception->getMessage(), $code, $exception);
					}
				},
			],
			[
				'pattern' => 'link-scanner/status',
				'method' => 'GET',
				'action' => function () {
					try {
						brokenLinksRequireUser();

						$store = new ScanStore(kirby());

						return brokenLinksResponse($store);
					} catch (Throwable $exception) {
						$code = (int)$exception->getCode();
						$code = $code >= 400 && $code < 600 ? $code : 500;
						throw new Exception($exception->getMessage(), $code, $exception);
					}
				},
			],
		],
	],

	'info' => [
		'version' => '1.0.0',
		'homepage' => 'https://github.com/scottboms/kirby-link-scanner',
		'license' => 'MIT',
		'authors' => [[
			'name' => 'Scott Boms',
		]],
	],
]);
