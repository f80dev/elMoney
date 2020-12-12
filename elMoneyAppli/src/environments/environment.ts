// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
// @ts-ignore
import { version } from '../../package.json';

export const environment = {
  production: false,
  domain_server: "http://localhost:6660",
  config_file:"config",
  domain_appli: "http://localhost:4200",
  appVersion: version,
  default_contract: "erd1qqqqqqqqqqqqqpgqeyayz09s2a4gnvcghdh9ma3he3j7cda0d8ss2apk2a",
  transac_cost: 0.08
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
