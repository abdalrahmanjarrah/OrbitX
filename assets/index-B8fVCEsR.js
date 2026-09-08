import{aT as q,aX as w}from"./index-B_ztbIQM.js";var c={exports:{}},s={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var f;function R(){if(f)return s;f=1;var u=q();function d(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var p=typeof Object.is=="function"?Object.is:d,l=u.useState,v=u.useEffect,h=u.useLayoutEffect,m=u.useDebugValue;function E(e,t){var n=t(),a=l({inst:{value:n,getSnapshot:t}}),r=a[0].inst,i=a[1];return h(function(){r.value=n,r.getSnapshot=t,o(r)&&i({inst:r})},[e,n,t]),v(function(){return o(r)&&i({inst:r}),e(function(){o(r)&&i({inst:r})})},[e]),m(n),n}function o(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!p(e,n)}catch{return!0}}function y(e,t){return t()}var x=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?y:E;return s.useSyncExternalStore=u.useSyncExternalStore!==void 0?u.useSyncExternalStore:x,s}var S;function _(){return S||(S=1,c.exports=R()),c.exports}var b=w();export{b as a,_ as r};
