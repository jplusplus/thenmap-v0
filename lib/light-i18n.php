<?php

define('LANG_FILE_DIRECTORY', dirname(__FILE__).'/../lang');

/* FIXME */
$L__lang = $interfaceLanguage->get();

$langfile = LANG_FILE_DIRECTORY.'/'.$L__lang.'/i18n.ini';

$cacheFilePath = sys_get_temp_dir() . '/php_i18n_' . md5(__FILE__) . '_' . $L__lang . '.cache';
if (file_exists($cacheFilePath) == false || filemtime($cacheFilePath) < filemtime($langfile)) {

  if (!file_exists($langfile)) {
	die('Missing internationalisation file: '.$langfile);
  }

  $ini = parse_ini_file($langfile, true);
  if ($ini == null)
	die('Cannot parse ini file: '.$langfile);

  function compile_ini_section($section, $prefix = '') {
	$tmp = '';
	foreach ($section as $key => $value) {
	  if (is_array($value)) {
		$tmp .= compile_ini_section($value, $key.'_');
	  } else {
		$tmp .= 'const '.$prefix.$key.' = \''.str_replace('\'', '\\\'', $value)."';\n";
	  }
	}
	return $tmp;
  }

  $compiled = "<?php class L {\n";
  $compiled .= compile_ini_section($ini);
  $compiled .= '}';

  file_put_contents($cacheFilePath, $compiled);
  chmod($cacheFilePath, 0777);
}

require_once $cacheFilePath;
