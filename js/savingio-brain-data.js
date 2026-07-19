/* Savingio legacy compatibility loader.
 * Older article pages reference /js/savingio-brain-data.js.
 * Load the canonical data file synchronously before navigation initializes.
 */
(function () {
  if (window.SAVINGIO_BRAIN_DATA) return;
  document.write('<script src="/data/savingio-brain-data.js?v=12"><\/script>');
})();
