/**
 * health-proxy.ts — Static import shim for ../../health/index.js
 *
 * This file exists SOLELY to give webpack a static require path
 * it can resolve at build time, eliminating the
 * "Critical dependency: the request of a dependency is an expression" warning.
 *
 * All health check logic remains in ../../health/ (not moved).
 */

'use strict';

// Static require — webpack can resolve this fixed relative path
const healthModule = require('../../health/index.js');

export const getSystemHealth = healthModule.getSystemHealth || null;
export const STATUS = healthModule.STATUS || null;

export default healthModule;
