<?php
/*
Plugin Name: Cloudflare Cache Purger
Description: One-click Cloudflare cache purge with logs, auto purge on post update. Light theme, editorial UI.
Version: 5.2
Author: Boss's Assistant
*/

// Enqueue admin typography.
add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'admin_page_cloudflare-cache-logs') return;
    wp_enqueue_style('ccp-sora', 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap', [], null);
});

// Core purge.
function ccp_purge_cache($trigger = 'Manual', $urls = []) {
    $token = get_option('ccp_token'); $zone_id = get_option('ccp_zone_id');
    if (!$token || !$zone_id) { ccp_log_event($trigger, false); return false; }
    
    $payload = ['purge_everything' => true];
    if (!empty($urls) && is_array($urls)) {
        $payload = ['files' => array_values($urls)];
    }

    $response = wp_remote_post("https://api.cloudflare.com/client/v4/zones/{$zone_id}/purge_cache", [
        'headers' => ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json'],
        'body'    => json_encode($payload),
    ]);
    $ok = (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200);
    if (!empty($urls)) $trigger .= ' (' . count($urls) . ' URLs)';
    ccp_log_event($trigger, $ok);
    return $ok;
}

function ccp_sanitize_remote_purge_slug($slug) {
    $slug = trim((string) $slug);
    $slug = trim(parse_url($slug, PHP_URL_PATH) ?: $slug, '/ ');
    $slug = preg_replace('/[^A-Za-z0-9_-]/', '', $slug);
    return substr($slug, 0, 80);
}

function ccp_render_remote_purge_response($ok) {
    status_header($ok ? 200 : 500);
    nocache_headers();
    header('X-Robots-Tag: noindex, noarchive');
    echo '<!DOCTYPE html><html><head><title>Cloudflare Cache Purge</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f5f0;color:#18170f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.box{max-width:360px;padding:34px 24px;text-align:center}.mark{width:42px;height:42px;border-radius:10px;background:#0051c3;margin:0 auto 16px}.title{font-size:18px;font-weight:650;letter-spacing:-.4px;margin-bottom:8px}.copy{font-size:13px;line-height:1.6;color:#6b6760}</style></head><body><div class="box"><div class="mark"></div><div class="title">' . ($ok ? 'Cache purge requested' : 'Purge request failed') . '</div><p class="copy">' . ($ok ? 'Cloudflare accepted the remote purge trigger.' : 'Check the saved Cloudflare API token and Zone ID.') . '</p></div></body></html>';
    exit;
}

function ccp_render_remote_purge_password_form($error = '') {
    status_header(200);
    nocache_headers();
    header('X-Robots-Tag: noindex, noarchive');
    $error_html = $error ? '<p class="error">' . esc_html($error) . '</p>' : '';
    echo '<!DOCTYPE html><html><head><title>Protected Cloudflare Purge</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f5f0;color:#18170f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.box{width:min(392px,calc(100vw - 36px));padding:34px 28px;text-align:center;background:#fff;border:1px solid #e5e2db;border-radius:14px;box-shadow:0 18px 48px rgba(24,23,15,.08)}.mark{width:54px;height:38px;border-radius:10px;background:#fff4e8;border:1px solid #fed7aa;margin:0 auto 18px;display:flex;align-items:center;justify-content:center}.mark i{display:block;width:26px;height:16px;border-radius:16px 16px 10px 10px;background:#f48120;position:relative}.mark i:after{content:"";position:absolute;right:-9px;bottom:0;width:16px;height:12px;border-radius:12px 12px 8px 8px;background:#faad3f}.title{font-size:19px;font-weight:700;letter-spacing:-.45px;margin-bottom:8px}.copy{font-size:13px;line-height:1.6;color:#6b6760;margin-bottom:18px}.field{text-align:left;margin-bottom:12px}.field label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9c9890;margin-bottom:8px}.field input{width:100%;height:44px;border:1px solid #d8d4cb;border-radius:8px;padding:0 12px;font-size:15px;outline:none}.field input:focus{border-color:#a09c94;box-shadow:0 0 0 4px rgba(244,129,32,.12)}.btn{width:100%;height:46px;border:0;border-radius:5px;background:#0051c3;color:#fff;font-size:16px;font-weight:700;cursor:pointer}.btn:hover{background:#0047a8}.error{font-size:12px;line-height:1.5;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px 10px;margin-bottom:12px}</style></head><body><form class="box" method="post"><div class="mark"><i></i></div><div class="title">Password required</div><p class="copy">Enter the remote purge password to clear the Cloudflare cache for this site.</p>' . $error_html . '<div class="field"><label for="ccp_remote_password">Purge password</label><input type="password" id="ccp_remote_password" name="ccp_remote_password" autocomplete="current-password" autofocus required></div><button class="btn" type="submit">Purge Everything</button></form></body></html>';
    exit;
}

add_action('template_redirect', function () {
    if (is_admin() || defined('DOING_AJAX') || defined('DOING_CRON')) return;
    $slug = ccp_sanitize_remote_purge_slug(get_option('ccp_remote_purge_slug', ''));
    if (!$slug) return;
    $path = ccp_sanitize_remote_purge_slug($_SERVER['REQUEST_URI'] ?? '');
    if (!$path || !hash_equals($slug, $path)) return;

    $password_hash = (string) get_option('ccp_remote_purge_password_hash', '');
    if ($password_hash) {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            ccp_render_remote_purge_password_form();
        }
        $entered_password = isset($_POST['ccp_remote_password']) ? trim((string) wp_unslash($_POST['ccp_remote_password'])) : '';
        if (!$entered_password || !wp_check_password($entered_password, $password_hash)) {
            ccp_render_remote_purge_password_form('That password did not match. Please try again.');
        }
    }

    $lock = 'ccp_remote_purge_lock_' . md5($slug);
    if (get_transient($lock)) ccp_render_remote_purge_response(false);
    set_transient($lock, true, 30);

    $ok = ccp_purge_cache('Remote URL');
    ccp_render_remote_purge_response($ok);
}, 1);

// Admin bar.
add_action('admin_bar_menu', function ($ab) {
    if (!current_user_can('manage_options')) return;
    $ab->add_menu(['id'=>'ccp_clear_cache','title'=>'Purge Cache','href'=>wp_nonce_url(admin_url('admin-post.php?action=ccp_manual_purge'),'ccp_clear_cache')]);
    $ab->add_menu(['id'=>'ccp_view_logs','title'=>'Cache Logs','href'=>admin_url('admin.php?page=cloudflare-cache-logs')]);
}, 100);

// Manual purge handler.
add_action('admin_post_ccp_manual_purge', function () {
    if (!current_user_can('manage_options') || !check_admin_referer('ccp_clear_cache')) wp_die('Unauthorized');
    $ok = ccp_purge_cache('Manual');
    wp_redirect(add_query_arg('ccp_status', $ok ? 'success' : 'fail', admin_url('admin.php?page=cloudflare-cache-logs')));
    exit;
});

// Admin notices.
add_action('admin_notices', function () {
    if (!isset($_GET['ccp_status'])) return;
    $map = ['success' => 'Cache purged successfully.', 'fail' => 'Purge failed - verify API token and Zone ID.', 'saved' => 'Credentials saved.'];
    $s = $_GET['ccp_status']; if (!isset($map[$s])) return;
    echo '<div class="notice is-dismissible" style="border-left:2px solid #111;padding:11px 16px;font-family:\'Sora\',sans-serif;"><p style="margin:0;font-size:13px;color:#111;">' . esc_html($map[$s]) . '</p></div>';
    echo "<script>if(window.history.replaceState){const u=new URL(window.location);u.searchParams.delete('ccp_status');window.history.replaceState(null,'',u.toString());}</script>";
});

// Auto purge on post save.
add_action('save_post', function ($id, $post, $update) {
    if (wp_is_post_autosave($id) || wp_is_post_revision($id) || $post->post_type !== 'post') return;
    $key = 'ccp_purge_lock_' . $id; if (get_transient($key)) return;
    $url = get_permalink($id);
    $home_url = home_url('/');
    ccp_purge_cache($update ? 'Post Update' : 'Post Publish', [$url, $home_url]);
    set_transient($key, true, 5);
}, 10, 3);

// Auto purge on bulk edit.
add_action('bulk_edit_custom_box', function () {
    if (!isset($_REQUEST['post_type']) || $_REQUEST['post_type'] !== 'post') return;
    $key = 'ccp_bulk_purge_lock'; if (get_transient($key)) return;
    ccp_purge_cache('Bulk Update'); set_transient($key, true, 5);
});

// Logger.
function ccp_log_event($trigger, $success) {
    $logs = get_option('ccp_logs', []);
    if (!is_array($logs)) $logs = [];
    $logs[] = ['time' => current_time('Y-m-d H:i:s'), 'type' => $trigger, 'status' => $success ? 'success' : 'fail'];
    if (count($logs) > 100) $logs = array_slice($logs, -100);
    update_option('ccp_logs', $logs);
}

// Admin menu.
add_action('admin_menu', function () {
    add_submenu_page(null, 'Cloudflare Cache', 'Cloudflare Cache', 'manage_options', 'cloudflare-cache-logs', 'ccp_render_page');
});

// Helpers.
function ccp_time_ago($ts) {
    $d = current_time('timestamp') - $ts;
    if ($d < 60) return 'just now';
    $m = floor($d/60); $h = floor($m/60); $dy = floor($h/24);
    if ($dy)  return $dy.'d '.($h%24 ? ($h%24).'h ' : '').'ago';
    if ($h)   return $h.'h '.($m%60 ? ($m%60).'m ' : '').'ago';
    return $m.'m ago';
}
function ccp_stats($logs) {
    if (empty($logs)) return ['total'=>0,'rate'=>0,'last'=>null];
    $ok = count(array_filter($logs, fn($l) => ($l['status']??'')==='success'));
    $last = end($logs);
    return ['total'=>count($logs),'rate'=>round($ok/count($logs)*100),'last'=>$last['time']??null];
}

// Render page.
function ccp_render_page() {
    $all   = get_option('ccp_logs', []);
    if (!is_array($all)) $all = [];
    $logs  = array_reverse(array_slice($all, -10));
    $stats = ccp_stats($all);
    $tok   = get_option('ccp_token','');
    $zid   = get_option('ccp_zone_id','');
    $remote_slug = ccp_sanitize_remote_purge_slug(get_option('ccp_remote_purge_slug',''));
    $remote_url = $remote_slug ? home_url('/' . $remote_slug . '/') : '';
    $remote_has_password = (bool) get_option('ccp_remote_purge_password_hash', '');
    $ok    = !empty($tok) && !empty($zid);
    $first_run = !$ok;
    $ago   = $stats['last'] ? ccp_time_ago(strtotime($stats['last'])) : 'never';
    $purge_url = esc_url(wp_nonce_url(admin_url('admin-post.php?action=ccp_manual_purge'),'ccp_clear_cache'));
    $save_url  = esc_url(admin_url('admin-post.php'));
    $success_count = count(array_filter($all, fn($l) => ($l['status'] ?? '') === 'success'));
    $fail_count = max(0, $stats['total'] - $success_count);
?>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

#ccp-wrap {
  --bg:        #F7F5F0;
  --surface:   #FFFFFF;
  --surface-2: #FEFCF8;
  --border:    #E5E2DB;
  --border-md: #C9C5BC;
  --border-dk: #A09C94;
  --t1:  #18170F;
  --t2:  #6B6760;
  --t3:  #9C9890;
  --t4:  #C4C0B8;
  --green:     #15803D;
  --green-bg:  #F0FDF4;
  --green-bd:  #BBF7D0;
  --amber:     #B45309;
  --amber-bg:  #FFFBEB;
  --amber-bd:  #FDE68A;
  --blue:      #1D4ED8;
  --blue-bg:   #EFF6FF;
  --blue-bd:   #BFDBFE;
  --red:       #DC2626;
  --red-bg:    #FEF2F2;
  --red-bd:    #FECACA;
  --cf:        #F48120;
  --cf-dark:   #D96F16;
  --ccp-admin-bar-offset: 0px;
  --ccp-sticky-gap: 8px;
  --easeSpring: cubic-bezier(0.16,1,0.3,1);
  --easeOut:    cubic-bezier(0,0,0.2,1);

  font-family: 'Sora', system-ui, sans-serif;
  background: var(--bg);
  color: var(--t1);
  box-sizing: border-box;
  margin: 0 -20px 0;
  padding-top: var(--ccp-sticky-gap);
  min-height: calc(100vh - var(--ccp-sticky-gap));
  -webkit-font-smoothing: antialiased;
}

#ccp-wrap * { box-sizing: border-box; }
#ccp-wrap a { text-decoration: none; }

body.wp-admin #ccp-wrap,
body.admin-bar #ccp-wrap { --ccp-admin-bar-offset: 32px; }

@media screen and (max-width: 782px) {
  body.wp-admin #ccp-wrap,
  body.admin-bar #ccp-wrap { --ccp-admin-bar-offset: 46px; }
}

#ccp-wrap .shell { min-height: calc(100vh - var(--ccp-sticky-gap)); }
#ccp-wrap .main { display: flex; flex-direction: column; min-width: 0; }
#ccp-wrap .topbar { height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 28px; display: flex; align-items: center; gap: 14px; position: sticky; top: calc(var(--ccp-admin-bar-offset) + var(--ccp-sticky-gap)); z-index: 20; }
#ccp-wrap .topbar-mark { width: 42px; height: 30px; border-radius: 8px; background: #FFF4E8; border: 1px solid #FED7AA; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 5px 14px rgba(244,129,32,0.08); flex-shrink: 0; }
#ccp-wrap .topbar-mark svg { width: 30px; height: auto; display: block; }
#ccp-wrap .topbar-title { font-size: 13.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.3px; white-space: nowrap; }
#ccp-wrap .topbar-title em { font-family: 'Times New Roman', Times, serif; font-style: italic; font-weight: 400; font-size: 14px; color: var(--t2); }
#ccp-wrap .topbar-divider { width: 1px; height: 16px; background: var(--border); flex-shrink: 0; }
#ccp-wrap .engine-tag { font-size: 11px; color: var(--t3); display: flex; align-items: center; gap: 5px; white-space: nowrap; flex-shrink: 0; }
#ccp-wrap .engine-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; animation: ccp-dot-pulse 2.8s cubic-bezier(0.4,0,0.6,1) infinite; }
#ccp-wrap .engine-dot.off { background: var(--amber); }
#ccp-wrap .topbar-sep { flex: 1; }
#ccp-wrap .topbar-acts { display: flex; align-items: center; gap: 8px; }

#ccp-wrap .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px; height: 32px; border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 130ms ease, border-color 130ms ease, color 130ms ease, transform 100ms ease, box-shadow 150ms ease; border: 1px solid transparent; font-family: inherit; letter-spacing: -0.1px; white-space: nowrap; position: relative; overflow: hidden; text-decoration: none; }
#ccp-wrap .btn:active { transform: scale(0.97); }
#ccp-wrap .btn-ghost { background: transparent; border-color: var(--border); color: var(--t2); }
#ccp-wrap .btn-ghost:hover { background: var(--bg); border-color: var(--border-md); color: var(--t1); }
#ccp-wrap .btn-primary { background: var(--cf); border-color: var(--cf); color: #fff; }
#ccp-wrap .btn-primary:hover { background: var(--cf-dark); border-color: var(--cf-dark); }
#ccp-wrap #ccp-purge-btn { width: 246px; height: 49px; padding: 0 18px; border-radius: 5px; gap: 0; background: #0051C3; border-color: #0051C3; color: #fff; font-size: 20px; font-weight: 650; letter-spacing: -0.28px; box-shadow: none; }
#ccp-wrap #ccp-purge-btn:hover { background: #0047A8; border-color: #0047A8; color: #fff; transform: none; box-shadow: none; }
#ccp-wrap #ccp-purge-btn:active { transform: scale(0.99); background: #003E91; border-color: #003E91; }
#ccp-wrap #ccp-purge-btn.loading { opacity: 0.84; transform: none; box-shadow: none; }
#ccp-wrap .btn-dark { background: var(--t1); border-color: var(--t1); color: #fff; }
#ccp-wrap .btn-dark:hover { background: #2D2C24; }
#ccp-wrap .btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(244,129,32,0.16); }
#ccp-wrap .btn svg { width: 12px; height: 12px; flex-shrink: 0; }
#ccp-wrap .btn.loading { pointer-events: none; opacity: 0.72; }

#ccp-wrap .content { padding: 24px 28px 32px; display: grid; grid-template-columns: minmax(0, 1fr) 292px; gap: 20px; align-items: start; max-width: 1320px; margin: 0 auto; width: 100%; }
#ccp-wrap .prot-bar { grid-column: 1/-1; background: var(--green-bg); border: 1px solid var(--green-bd); border-radius: 8px; padding: 13px 16px; display: flex; align-items: center; gap: 10px; color: var(--green); font-size: 12px; font-weight: 500; animation: ccp-bar-in 300ms var(--easeSpring) both; }
#ccp-wrap .prot-bar.off { background: var(--amber-bg); border-color: var(--amber-bd); color: var(--amber); }
#ccp-wrap .prot-bar-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; position: relative; }
#ccp-wrap .prot-bar-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: currentColor; opacity: 0.16; animation: ccp-dot-pulse 3s ease-in-out infinite; }
#ccp-wrap .prot-bar-right { margin-left: auto; font-size: 11px; font-weight: 400; color: currentColor; opacity: 0.68; white-space: nowrap; flex-shrink: 0; }

#ccp-wrap .stats { grid-column: 1/-1; display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
#ccp-wrap .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px 22px; min-height: 118px; animation: ccp-card-in 400ms var(--easeSpring) both; transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease; }
#ccp-wrap .stat:nth-child(1) { animation-delay: 80ms; }
#ccp-wrap .stat:nth-child(2) { animation-delay: 130ms; }
#ccp-wrap .stat:nth-child(3) { animation-delay: 180ms; }
#ccp-wrap .stat:nth-child(4) { animation-delay: 230ms; }
#ccp-wrap .stat:hover { border-color: var(--border-md); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(24,23,15,0.06); }
#ccp-wrap .stat-lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t3); margin-bottom: 10px; }
#ccp-wrap .stat-val { font-size: 30px; font-weight: 600; color: var(--t1); letter-spacing: -1.2px; line-height: 1; margin-bottom: 8px; }
#ccp-wrap .stat-val.green { color: var(--green); }
#ccp-wrap .stat-val.red { color: var(--red); }
#ccp-wrap .stat-val.small { font-size: 16px; letter-spacing: -0.4px; margin-top: 4px; }
#ccp-wrap .stat-foot { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--t3); flex-wrap: nowrap; }
#ccp-wrap .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
#ccp-wrap .chip.green { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd); }
#ccp-wrap .chip.amber { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }
#ccp-wrap .chip.red { background: var(--red-bg); color: var(--red); border: 1px solid var(--red-bd); }
#ccp-wrap .chip.blue { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-bd); }

#ccp-wrap .tbl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; animation: ccp-card-in 400ms var(--easeSpring) 260ms both; }
#ccp-wrap .tbl-headline { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
#ccp-wrap .tbl-title { font-size: 13px; font-weight: 600; color: var(--t1); letter-spacing: -0.25px; }
#ccp-wrap .tbl-count { font-size: 11px; color: var(--t3); font-weight: 500; background: var(--bg); border: 1px solid var(--border); padding: 2px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
#ccp-wrap table { width: 100%; border-collapse: collapse; margin: 0; padding: 0; }
#ccp-wrap thead th { padding: 7px 16px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.055em; text-transform: uppercase; color: var(--t3); background: var(--bg); border-bottom: 1px solid var(--border); text-align: left; }
#ccp-wrap thead th:last-child { text-align: right; }
#ccp-wrap tbody tr { border-bottom: 1px solid var(--border); transition: background 100ms linear; }
#ccp-wrap tbody tr:last-child { border-bottom: none; }
#ccp-wrap tbody tr:hover { background: #FAFAF7; }
#ccp-wrap td { padding: 12px 16px; vertical-align: middle; }
#ccp-wrap td:last-child { text-align: right; }
#ccp-wrap .date-main { font-size: 12.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; display: block; }
#ccp-wrap .date-sub { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--t3); display: block; margin-top: 3px; }
#ccp-wrap .trigger { font-size: 12px; font-weight: 500; color: var(--t2); white-space: nowrap; }
#ccp-wrap .s-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 6px; border-radius: 5px; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
#ccp-wrap .s-pill.ok { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd); }
#ccp-wrap .s-pill.fail { background: var(--red-bg); color: var(--red); border: 1px solid var(--red-bd); }
#ccp-wrap .s-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
#ccp-wrap .empty { padding: 16px; }
#ccp-wrap .empty-shell { position: relative; overflow: hidden; border: 1px solid var(--border); border-radius: 8px; background: linear-gradient(180deg,#FFFFFF 0%,#FEFCF8 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.88); }
#ccp-wrap .empty-shell:before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 18% 0%, rgba(244,129,32,0.08), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.7), transparent 38%); }
#ccp-wrap .empty-head { position: relative; z-index: 1; display: grid; grid-template-columns: 36px minmax(0,1fr); gap: 12px; align-items: center; padding: 16px 16px 14px; border-bottom: 1px solid var(--border); }
#ccp-wrap .empty-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--cf); box-shadow: 0 8px 22px rgba(24,23,15,0.05); }
#ccp-wrap .empty-icon svg { width: 16px; height: 16px; stroke-width: 1.9; }
#ccp-wrap .empty-t { font-size: 13px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; margin-bottom: 3px; }
#ccp-wrap .empty-s { font-size: 11.5px; line-height: 1.55; color: var(--t3); max-width: 560px; }
#ccp-wrap .sk-table { position: relative; z-index: 1; display: grid; gap: 0; padding: 0; }
#ccp-wrap .sk-row { display: grid; grid-template-columns: 34% minmax(0,1fr) 86px; gap: 16px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); }
#ccp-wrap .sk-row:last-child { border-bottom: none; }
#ccp-wrap .sk-stack { display: grid; gap: 6px; min-width: 0; }
#ccp-wrap .sk-line, #ccp-wrap .sk-pill { position: relative; overflow: hidden; display: block; max-width: 100%; border-radius: 999px; background: #EDEAE2; }
#ccp-wrap .sk-line:after, #ccp-wrap .sk-pill:after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent); animation: ccp-skeleton 1.8s ease-in-out infinite; }
#ccp-wrap .sk-line.w1 { width: 92px; height: 10px; }
#ccp-wrap .sk-line.w2 { width: 58px; height: 8px; opacity: 0.76; }
#ccp-wrap .sk-line.w3 { width: 148px; height: 10px; }
#ccp-wrap .sk-line.w4 { width: 112px; height: 10px; }
#ccp-wrap .sk-line.w5 { width: 132px; height: 10px; }
#ccp-wrap .sk-pill { justify-self: end; width: 66px; height: 22px; border-radius: 5px; background: var(--green-bg); border: 1px solid var(--green-bd); }
#ccp-wrap .empty-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 12px 16px 14px; border-top: 1px solid var(--border); font-size: 11px; color: var(--t3); background: rgba(247,245,240,0.48); }
@keyframes ccp-skeleton { 100% { transform: translateX(100%); } }

#ccp-wrap .panels { display: flex; flex-direction: column; gap: 16px; }
#ccp-wrap .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; animation: ccp-card-in 400ms var(--easeSpring) both; }
#ccp-wrap .panel:nth-child(1) { animation-delay: 180ms; }
#ccp-wrap .panel-hd { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
#ccp-wrap .panel-title { font-size: 12.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
#ccp-wrap .panel-title svg { width: 12px; height: 12px; color: var(--t3); }
#ccp-wrap .panel-count { font-size: 11px; color: var(--t3); white-space: nowrap; }
#ccp-wrap .panel-bd { padding: 14px 16px; }
#ccp-wrap .info-card { grid-column: 1/-1; width: min(100%, 760px); margin: 2px auto 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; animation: ccp-card-in 400ms var(--easeSpring) 320ms both; }
#ccp-wrap .info-card.is-spotlight { width: min(100%, 920px); border-color: rgba(244,129,32,0.28); box-shadow: 0 22px 70px rgba(24,23,15,0.08), 0 0 0 1px rgba(244,129,32,0.08); }
#ccp-wrap .info-hd { padding: 12px 14px 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.72); }
#ccp-wrap .info-title-wrap { min-width: 0; display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
#ccp-wrap .info-title { font-size: 12.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; display: flex; align-items: center; gap: 7px; }
#ccp-wrap .info-title svg { width: 12px; height: 12px; color: var(--t3); }
#ccp-wrap .info-kicker { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--cf-dark); background: #FFF4E8; border: 1px solid #FED7AA; border-radius: 999px; padding: 3px 8px; }
#ccp-wrap .info-toggle { height: 26px; padding: 0 9px; font-size: 11px; }
#ccp-wrap .info-body { padding: 0; }
#ccp-wrap .info-card.is-collapsed .info-body { display: none; }
#ccp-wrap .info-card.is-collapsed .info-hd { border-bottom-color: transparent; }
#ccp-wrap .guide-hero { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 16px; align-items: center; padding: 18px 18px 16px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#FFFFFF 0%,#FEFCF8 100%); overflow: hidden; }
#ccp-wrap .guide-hero:before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 8% 0%, rgba(244,129,32,0.11), transparent 32%); }
#ccp-wrap .guide-hero > * { position: relative; z-index: 1; }
#ccp-wrap .guide-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cf-dark); margin-bottom: 6px; }
#ccp-wrap .guide-title { font-size: 18px; line-height: 1.25; font-weight: 600; letter-spacing: -0.5px; color: var(--t1); margin: 0 0 6px; }
#ccp-wrap .guide-copy { font-size: 12px; line-height: 1.7; color: var(--t2); margin: 0; max-width: 690px; }
#ccp-wrap .guide-setup-intro { margin-bottom: 14px; }
#ccp-wrap .guide-meter { width: 94px; height: 58px; border: 1px solid var(--border); border-radius: 8px; background: rgba(255,255,255,0.72); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--t3); font-size: 10.5px; font-weight: 500; }
#ccp-wrap .guide-meter strong { display: block; color: var(--t1); font-size: 18px; line-height: 1; margin-bottom: 4px; letter-spacing: -0.3px; }
#ccp-wrap .guide-tabs { display: flex; gap: 4px; padding: 10px; border-bottom: 1px solid var(--border); background: var(--bg); overflow-x: auto; }
#ccp-wrap .guide-tab { height: 31px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--t2); font: inherit; font-size: 11.5px; font-weight: 600; padding: 0 11px; cursor: pointer; white-space: nowrap; transition: background 130ms ease, border-color 130ms ease, color 130ms ease; }
#ccp-wrap .guide-tab:hover { color: var(--t1); background: rgba(255,255,255,0.55); }
#ccp-wrap .guide-tab.is-active { color: var(--t1); background: var(--surface); border-color: var(--border); box-shadow: 0 1px 2px rgba(24,23,15,0.04); }
#ccp-wrap .guide-panel { display: none; padding: 18px; }
#ccp-wrap .guide-panel.is-active { display: block; }
#ccp-wrap .guide-section-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--t3); margin: 0 0 10px; }
#ccp-wrap .guide-contrast { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin-bottom: 18px; }
#ccp-wrap .guide-contrast-item { border: 1px solid var(--border); border-radius: 8px; padding: 14px; background: var(--surface-2); }
#ccp-wrap .guide-contrast-item.solution { background: var(--green-bg); border-color: var(--green-bd); }
#ccp-wrap .guide-contrast-item.problem { background: #FFF7ED; border-color: #FED7AA; }
#ccp-wrap .guide-contrast-title { font-size: 12.5px; font-weight: 600; color: var(--t1); margin-bottom: 5px; }
#ccp-wrap .guide-contrast-copy { font-size: 11.5px; line-height: 1.65; color: var(--t2); margin: 0; }
#ccp-wrap .guide-features { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
#ccp-wrap .guide-feature { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 13px; }
#ccp-wrap .guide-feature-num { width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; background: var(--cf); color: #fff; font-size: 10.5px; font-weight: 700; margin-bottom: 8px; }
#ccp-wrap .guide-feature-title { font-size: 12px; font-weight: 600; color: var(--t1); margin-bottom: 4px; }
#ccp-wrap .guide-feature-copy { font-size: 10.5px; line-height: 1.55; color: var(--t3); margin: 0; }
#ccp-wrap .guide-progress { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin: 0 0 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
#ccp-wrap .guide-progress-track { flex: 1; height: 5px; border-radius: 999px; overflow: hidden; background: #EDEAE2; }
#ccp-wrap .guide-progress-bar { height: 100%; width: 0%; border-radius: inherit; background: var(--cf); transition: width 260ms var(--easeOut); }
#ccp-wrap .guide-progress-label { font-size: 11px; color: var(--t3); white-space: nowrap; }
#ccp-wrap .guide-progress-label strong { color: var(--t1); }
#ccp-wrap .guide-done-banner { display: none; margin: 0 0 14px; padding: 13px 14px; border: 1px solid var(--green-bd); border-radius: 8px; background: var(--green-bg); color: var(--green); font-size: 11.5px; font-weight: 600; }
#ccp-wrap .guide-done-banner.is-visible { display: block; }
#ccp-wrap .guide-steps { display: grid; gap: 8px; }
#ccp-wrap .guide-step { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; align-items: start; }
#ccp-wrap .guide-step-num { width: 28px; height: 28px; border-radius: 7px; background: var(--bg); border: 1px solid var(--border); color: var(--t2); display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; margin-top: 1px; }
#ccp-wrap .guide-step.is-active .guide-step-num { background: #FFF4E8; border-color: #FED7AA; color: var(--cf-dark); }
#ccp-wrap .guide-step.is-done .guide-step-num { background: var(--green-bg); border-color: var(--green-bd); color: var(--green); font-size: 9px; }
#ccp-wrap .guide-step-box { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); overflow: hidden; }
#ccp-wrap .guide-step.is-active .guide-step-box { border-color: #FED7AA; box-shadow: 0 8px 28px rgba(244,129,32,0.07); }
#ccp-wrap .guide-step.is-done .guide-step-box { border-color: var(--green-bd); }
#ccp-wrap .guide-step-toggle { width: 100%; min-height: 42px; border: 0; background: transparent; color: var(--t1); font: inherit; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 13px; cursor: pointer; text-align: left; }
#ccp-wrap .guide-step-toggle:hover { background: var(--surface-2); }
#ccp-wrap .guide-step-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
#ccp-wrap .guide-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--cf-dark); background: #FFF4E8; border: 1px solid #FED7AA; border-radius: 999px; padding: 2px 7px; flex-shrink: 0; }
#ccp-wrap .guide-chev { color: var(--t3); font-family: 'JetBrains Mono', monospace; font-size: 12px; flex-shrink: 0; transition: transform 160ms ease; }
#ccp-wrap .guide-step.is-active .guide-chev { transform: rotate(45deg); color: var(--cf-dark); }
#ccp-wrap .guide-step-content { display: none; border-top: 1px solid var(--border); padding: 12px 13px 13px; }
#ccp-wrap .guide-step.is-active .guide-step-content { display: block; }
#ccp-wrap .guide-step-content p, #ccp-wrap .guide-step-content li { font-size: 11.5px; line-height: 1.7; color: var(--t2); }
#ccp-wrap .guide-step-content p { margin: 0 0 10px; }
#ccp-wrap .guide-step-content ol { margin: 0 0 10px 18px; padding: 0; }
#ccp-wrap .guide-step-content li { margin-bottom: 4px; }
#ccp-wrap .guide-step-content strong { color: var(--t1); font-weight: 600; }
#ccp-wrap .guide-hint, #ccp-wrap .guide-warning, #ccp-wrap .guide-success { border-radius: 7px; padding: 9px 11px; margin-top: 9px; font-size: 10.5px; line-height: 1.55; }
#ccp-wrap .guide-hint { color: var(--t2); background: var(--bg); border: 1px solid var(--border); }
#ccp-wrap .guide-warning { color: var(--amber); background: var(--amber-bg); border: 1px solid var(--amber-bd); }
#ccp-wrap .guide-success { color: var(--green); background: var(--green-bg); border: 1px solid var(--green-bd); }
#ccp-wrap .guide-code { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; background: var(--bg); color: var(--t1); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; }
#ccp-wrap .guide-step-actions { margin-top: 11px; display: flex; justify-content: flex-end; }
#ccp-wrap .guide-perm { width: 100%; border-collapse: collapse; margin: 10px 0 12px; font-size: 11px; }
#ccp-wrap .guide-perm th { background: var(--bg); color: var(--t3); font-weight: 700; text-align: left; border: 1px solid var(--border); padding: 7px 8px; }
#ccp-wrap .guide-perm td { border: 1px solid var(--border); color: var(--t2); padding: 7px 8px; }
#ccp-wrap .guide-perm .guide-val { color: var(--cf-dark); font-weight: 700; }
#ccp-wrap .guide-trouble { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); overflow: hidden; margin-bottom: 8px; }
#ccp-wrap .guide-trouble summary { cursor: pointer; list-style: none; padding: 12px 14px; font-size: 12px; font-weight: 600; color: var(--t1); background: var(--surface-2); }
#ccp-wrap .guide-trouble summary::-webkit-details-marker { display: none; }
#ccp-wrap .guide-trouble summary:after { content: "+"; float: right; color: var(--t3); font-family: 'JetBrains Mono', monospace; }
#ccp-wrap .guide-trouble[open] summary:after { content: "-"; color: var(--cf-dark); }
#ccp-wrap .guide-trouble p { border-top: 1px solid var(--border); margin: 0; padding: 12px 14px; font-size: 11.5px; line-height: 1.65; color: var(--t2); }
#ccp-wrap .guide-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--border); background: var(--bg); padding: 12px 18px; font-size: 10.5px; color: var(--t3); }
#ccp-wrap .guide-links { display: flex; gap: 10px; flex-wrap: wrap; }
#ccp-wrap .guide-link { color: var(--cf-dark); text-decoration: none; font-weight: 600; }
#ccp-wrap .guide-link:hover { text-decoration: underline; }
#ccp-wrap .field { margin-bottom: 14px; }
#ccp-wrap .field:last-child { margin-bottom: 0; }
#ccp-wrap .flbl { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t3); margin-bottom: 7px; }
#ccp-wrap .frow { position: relative; display: flex; align-items: center; }
#ccp-wrap .finput { display: block; width: 100%; height: 36px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--t1); background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 0 38px 0 11px; outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
#ccp-wrap .finput:hover { border-color: var(--border-md); }
#ccp-wrap .finput:focus { border-color: var(--border-dk); box-shadow: 0 0 0 3px rgba(24,23,15,0.07); }
#ccp-wrap .finput::placeholder { color: var(--t4); }
#ccp-wrap .finput-plain { padding-right: 11px; }
#ccp-wrap .feye { position: absolute; right: 10px; width: 20px; height: 20px; border: none; background: transparent; color: var(--t3); padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
#ccp-wrap .feye:hover { color: var(--t1); }
#ccp-wrap .fhint { font-size: 10.5px; color: var(--t3); margin-top: 7px; line-height: 1.55; }
#ccp-wrap .fcheck { margin-top: 10px; display: flex; align-items: flex-start; gap: 8px; font-size: 10.5px; line-height: 1.55; color: var(--t2); }
#ccp-wrap .fcheck input { width: 14px; height: 14px; margin: 1px 0 0; accent-color: var(--cf); flex-shrink: 0; }
#ccp-wrap .remote-card { margin-top: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); overflow: hidden; }
#ccp-wrap .remote-card-hd { padding: 10px 11px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
#ccp-wrap .remote-card-title { font-size: 11.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.15px; }
#ccp-wrap .remote-state { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--t3); }
#ccp-wrap .remote-state.on { color: var(--green); }
#ccp-wrap .remote-state.secure { color: var(--blue); }
#ccp-wrap .remote-url { display: block; padding: 10px 11px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; line-height: 1.55; color: var(--t2); word-break: break-all; background: #fff; }
#ccp-wrap .remote-url.empty { color: var(--t4); font-family: inherit; }
#ccp-wrap .remote-warning { padding: 9px 11px; border-top: 1px solid var(--border); font-size: 10.5px; line-height: 1.55; color: var(--amber); background: var(--amber-bg); }
#ccp-wrap .remote-warning.secure { color: var(--blue); background: var(--blue-bg); }
#ccp-wrap .form-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 14px; margin-top: 14px; border-top: 1px solid var(--border); }
#ccp-wrap .form-note { font-size: 10.5px; color: var(--t3); line-height: 1.4; }

@keyframes ccp-card-in { from{opacity:0; transform:translateY(8px) scale(0.99)} to{opacity:1; transform:translateY(0) scale(1)} }
@keyframes ccp-bar-in { from{opacity:0; transform:translateY(-6px)} to{opacity:1; transform:translateY(0)} }
@keyframes ccp-dot-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(21,128,61,0)} 50%{box-shadow:0 0 0 4px rgba(21,128,61,0.15)} }
@keyframes ccp-spin { to{transform:rotate(360deg)} }

@media (max-width: 1120px) {
  #ccp-wrap .stats { grid-template-columns: repeat(2,1fr); }
  #ccp-wrap .content { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  #ccp-wrap { margin: 0 -10px 0; }
  #ccp-wrap .shell { display: block; }
  #ccp-wrap .topbar { padding: 0 16px; gap: 10px; overflow-x: auto; }
  #ccp-wrap .content { padding: 18px 16px 28px; }
  #ccp-wrap .stats { grid-template-columns: 1fr; }
  #ccp-wrap .prot-bar { align-items: flex-start; }
  #ccp-wrap .prot-bar-right { display: none; }
  #ccp-wrap .guide-hero { grid-template-columns: 1fr; }
  #ccp-wrap .guide-meter { width: 100%; height: auto; align-items: flex-start; padding: 10px 12px; }
  #ccp-wrap .guide-contrast, #ccp-wrap .guide-features { grid-template-columns: 1fr; }
  #ccp-wrap .guide-step { grid-template-columns: 24px minmax(0,1fr); gap: 8px; }
  #ccp-wrap .guide-step-num { width: 24px; height: 24px; border-radius: 6px; }
  #ccp-wrap .guide-panel { padding: 14px; }
  #ccp-wrap .guide-footer { padding: 12px 14px; }
}
</style>

<div id="ccp-wrap">
  <div class="shell">
    <div class="main">
      <header class="topbar">
        <span class="topbar-mark" aria-hidden="true"><svg viewBox="0 0 122.88 55.57" xmlns="http://www.w3.org/2000/svg"><g><polygon fill="#FFFFFF" points="112.65,33.03 97.2,24.17 94.54,23.01 31.33,23.45 31.33,55.53 112.65,55.53 112.65,33.03"/><path fill="#F48120" d="M84.52,52.58c0.76-2.59,0.47-4.97-0.79-6.73c-1.15-1.62-3.1-2.56-5.44-2.67L33.96,42.6 c-0.29,0-0.54-0.14-0.68-0.36c-0.14-0.21-0.18-0.5-0.11-0.79c0.14-0.43,0.58-0.76,1.04-0.79l44.73-0.58 c5.29-0.25,11.06-4.54,13.07-9.8l2.56-6.66c0.11-0.29,0.14-0.58,0.07-0.86C91.76,9.72,80.13,0,66.23,0 c-12.82,0-23.7,8.28-27.59,19.77c-2.52-1.87-5.73-2.88-9.18-2.56c-6.16,0.61-11.09,5.55-11.7,11.7c-0.14,1.58-0.04,3.13,0.32,4.57 C8.03,33.78,0,41.99,0,52.11c0,0.9,0.07,1.8,0.18,2.7c0.07,0.43,0.43,0.76,0.86,0.76h81.82c0.47,0,0.9-0.32,1.04-0.79L84.52,52.58z"/><path fill="#FAAD3F" d="M98.64,24.09c-0.4,0-0.83,0-1.22,0.04c-0.29,0-0.54,0.22-0.65,0.5l-1.73,6.01c-0.76,2.59-0.47,4.97,0.79,6.73 c1.15,1.62,3.1,2.56,5.44,2.67l9.44,0.58c0.29,0,0.54,0.14,0.68,0.36c0.14,0.22,0.18,0.54,0.11,0.79 c-0.14,0.43-0.58,0.76-1.04,0.79l-9.83,0.58c-5.33,0.25-11.06,4.54-13.07,9.79l-0.72,1.84c-0.14,0.36,0.11,0.72,0.5,0.72h33.78 c0.4,0,0.76-0.25,0.86-0.65c0.58-2.09,0.9-4.29,0.9-6.55C122.88,34.97,112,24.09,98.64,24.09z"/></g></svg></span><span class="topbar-title">Cloudflare <em>Cache</em> Control</span>
        <div class="topbar-divider"></div>
        <div class="engine-tag">
          <div class="engine-dot <?php echo $ok ? '' : 'off'; ?>"></div>
          <?php echo $ok ? 'API Connected' : 'Credentials Missing'; ?>
        </div>
        <div class="topbar-sep"></div>
        <div class="topbar-acts">
          <a href="<?php echo $purge_url; ?>" class="btn btn-primary" id="ccp-purge-btn">
            <span class="purge-label">Purge Everything</span>
          </a>
        </div>
      </header>

      <div class="content">
        <div class="prot-bar <?php echo $ok ? '' : 'off'; ?>">
          <div class="prot-bar-dot"></div>
          <span><?php echo $ok ? 'Cloudflare API credentials are configured and purge requests can run from WordPress.' : 'Add your Cloudflare API token and Zone ID before purge requests can succeed.'; ?></span>
          <div class="prot-bar-right">Last purge: <?php echo esc_html($ago); ?></div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-lbl">Total Purges</div>
            <div class="stat-val"><?php echo intval($stats['total']); ?></div>
            <div class="stat-foot"><span class="chip blue">Logged</span><span>events recorded</span></div>
          </div>
          <div class="stat">
            <div class="stat-lbl">Success Rate</div>
            <div class="stat-val green"><?php echo intval($stats['rate']); ?>%</div>
            <div class="stat-foot"><span class="chip green"><?php echo intval($success_count); ?> success</span><span>API responses</span></div>
          </div>
          <div class="stat">
            <div class="stat-lbl">Failed Purges</div>
            <div class="stat-val red"><?php echo intval($fail_count); ?></div>
            <div class="stat-foot"><span class="chip <?php echo $fail_count ? 'red' : 'green'; ?>"><?php echo $fail_count ? 'Review' : 'Clean'; ?></span><span>recent failures</span></div>
          </div>
          <div class="stat">
            <div class="stat-lbl">Last Purge</div>
            <div class="stat-val small"><?php echo esc_html($ago); ?></div>
            <div class="stat-foot"><span class="chip <?php echo $ok ? 'green' : 'amber'; ?>"><?php echo $ok ? 'Ready' : 'Setup'; ?></span><span>current state</span></div>
          </div>
        </div>

        <div class="tbl-card">
          <div class="tbl-headline">
            <span class="tbl-title">Purge Log</span>
            <span class="tbl-count"><?php echo count($logs); ?> shown</span>
          </div>
          <?php if (empty($logs)): ?>
            <div class="empty">
              <div class="empty-shell">
                <div class="empty-head">
                  <div class="empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M4 12a8 8 0 0 1 13.7-5.7"></path>
                      <path d="M18 4v5h-5"></path>
                      <path d="M20 12a8 8 0 0 1-13.7 5.7"></path>
                      <path d="M6 20v-5h5"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="empty-t">Waiting for the first purge</div>
                    <div class="empty-s">Your history will appear here after a manual purge, post update, or bulk edit refreshes Cloudflare.</div>
                  </div>
                </div>
                <div class="sk-table" aria-hidden="true">
                  <div class="sk-row">
                    <div class="sk-stack">
                      <span class="sk-line w1"></span>
                      <span class="sk-line w2"></span>
                    </div>
                    <span class="sk-line w3"></span>
                    <span class="sk-pill"></span>
                  </div>
                  <div class="sk-row">
                    <div class="sk-stack">
                      <span class="sk-line w1"></span>
                      <span class="sk-line w2"></span>
                    </div>
                    <span class="sk-line w4"></span>
                    <span class="sk-pill"></span>
                  </div>
                  <div class="sk-row">
                    <div class="sk-stack">
                      <span class="sk-line w1"></span>
                      <span class="sk-line w2"></span>
                    </div>
                    <span class="sk-line w5"></span>
                    <span class="sk-pill"></span>
                  </div>
                </div>
                <div class="empty-foot">
                  <span class="chip amber">First run</span>
                  <span>Save credentials, then run one small purge test to confirm everything is connected.</span>
                </div>
              </div>
            </div>
          <?php else: ?>
            <table>
              <thead>
                <tr>
                  <th style="width:34%;">Timestamp</th>
                  <th>Trigger</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
              <?php foreach ($logs as $l):
                $ts = strtotime($l['time']);
                $isok = ($l['status'] ?? '') === 'success';
              ?>
                <tr>
                  <td>
                    <span class="date-main"><?php echo esc_html(date_i18n('j M Y', $ts)); ?></span>
                    <span class="date-sub"><?php echo esc_html(date_i18n('H:i:s', $ts)); ?></span>
                  </td>
                  <td><span class="trigger"><?php echo esc_html($l['type']); ?></span></td>
                  <td>
                    <?php if ($isok): ?>
                      <span class="s-pill ok"><span class="s-dot"></span>Success</span>
                    <?php else: ?>
                      <span class="s-pill fail"><span class="s-dot"></span>Failed</span>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
              </tbody>
            </table>
          <?php endif; ?>
        </div>

        <div class="panels">
          <div class="panel">
            <div class="panel-hd">
              <span class="panel-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M5 7h6M5 9.5h4"/></svg>
                Configuration
              </span>
              <span class="panel-count"><?php echo $ok ? 'Connected' : 'Required'; ?></span>
            </div>
            <div class="panel-bd">
              <form method="post" action="<?php echo $save_url; ?>">
                <?php wp_nonce_field('ccp_save_settings'); ?>
                <input type="hidden" name="action" value="ccp_save_settings">

                <div class="field">
                  <label class="flbl" for="ccp_token">API Token</label>
                  <div class="frow">
                    <input type="password" class="finput" name="ccp_token" id="ccp_token" value="<?php echo esc_attr($tok); ?>" placeholder="Bearer token" autocomplete="off" spellcheck="false">
                    <button type="button" class="feye" id="ccp-token-toggle" aria-label="Toggle API token visibility">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                  <div class="fhint">Cloudflare profile, API Tokens, Cache Purge template.</div>
                </div>

                <div class="field">
                  <label class="flbl" for="ccp_zone_id">Zone ID</label>
                  <div class="frow">
                    <input type="text" class="finput finput-plain" name="ccp_zone_id" id="ccp_zone_id" value="<?php echo esc_attr($zid); ?>" placeholder="Domain Zone ID" autocomplete="off" spellcheck="false">
                  </div>
                  <div class="fhint">Cloudflare domain overview, API section.</div>
                </div>

                <div class="field">
                  <label class="flbl" for="ccp_remote_purge_slug">Remote Purge Path</label>
                  <div class="frow">
                    <input type="text" class="finput finput-plain" name="ccp_remote_purge_slug" id="ccp_remote_purge_slug" value="<?php echo esc_attr($remote_slug); ?>" placeholder="purge" autocomplete="off" spellcheck="false">
                  </div>
                  <div class="fhint">Optional URL path. Use a memorable path like purge, then add a password below if the path is simple.</div>
                </div>

                <div class="field">
                  <label class="flbl" for="ccp_remote_purge_password">Remote Purge Password</label>
                  <div class="frow">
                    <input type="password" class="finput" name="ccp_remote_purge_password" id="ccp_remote_purge_password" value="" placeholder="<?php echo $remote_has_password ? 'Leave blank to keep current password' : 'Optional password'; ?>" autocomplete="new-password" spellcheck="false">
                  </div>
                  <div class="fhint"><?php echo $remote_has_password ? 'Password protection is active. Enter a new password only when you want to replace it.' : 'Optional. When set, the purge URL opens a small password screen before clearing cache.'; ?></div>
                  <?php if ($remote_has_password): ?>
                    <label class="fcheck">
                      <input type="checkbox" name="ccp_clear_remote_password" value="1">
                      <span>Remove password protection and allow URL-only remote purge.</span>
                    </label>
                  <?php endif; ?>
                  <div class="remote-card">
                    <div class="remote-card-hd">
                      <span class="remote-card-title">Generated purge URL</span>
                      <span class="remote-state <?php echo $remote_url ? ($remote_has_password ? 'secure' : 'on') : ''; ?>"><?php echo $remote_url ? ($remote_has_password ? 'Password' : 'URL only') : 'Disabled'; ?></span>
                    </div>
                    <?php if ($remote_url): ?>
                      <a class="remote-url" href="<?php echo esc_url($remote_url); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($remote_url); ?></a>
                    <?php else: ?>
                      <span class="remote-url empty">Save a secret path to generate the remote purge URL.</span>
                    <?php endif; ?>
                    <?php if ($remote_url && $remote_has_password): ?>
                      <div class="remote-warning secure">Visitors must enter the saved password before the purge runs. This is the best mode for simple paths like /purge/.</div>
                    <?php else: ?>
                      <div class="remote-warning">Anyone with this exact URL can purge everything. Add a password for safer simple URLs.</div>
                    <?php endif; ?>
                  </div>
                </div>

                <div class="form-foot">
                  <span class="form-note">Stored in wp_options.</span>
                  <button type="submit" class="btn btn-dark">Save</button>
                </div>
              </form>
            </div>
          </div>

        </div>

        <div class="info-card <?php echo $first_run ? 'is-spotlight' : 'is-collapsed'; ?>" id="ccp-info-card" data-first-run="<?php echo $first_run ? '1' : '0'; ?>">
          <div class="info-hd">
            <div class="info-title-wrap">
              <span class="info-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5v3M8 11v.1"/></svg>
                Cloudflare setup guide
              </span>
              <span class="info-kicker"><?php echo $first_run ? 'First-time setup' : 'Reference'; ?></span>
            </div>
            <button type="button" class="btn btn-ghost info-toggle" id="ccp-info-toggle"><?php echo $first_run ? 'Minimize' : 'Read'; ?></button>
          </div>
          <div class="info-body" id="ccp-info-body">
            <div class="guide-hero">
              <div>
                <div class="guide-eyebrow">5 minute setup</div>
                <h3 class="guide-title">Connect WordPress to Cloudflare without guesswork.</h3>
                <p class="guide-copy">You only need a Zone ID and an API token with cache purge permission. This guide opens automatically for first-time users, then stays minimized after they close it.</p>
              </div>
              <div class="guide-meter" aria-live="polite">
                <strong id="ccp-guide-meter">0/5</strong>
                steps done
              </div>
            </div>

            <div class="guide-tabs" role="tablist" aria-label="Cloudflare setup guide">
              <button type="button" class="guide-tab is-active" data-guide-tab="why" role="tab" aria-selected="true">Why it matters</button>
              <button type="button" class="guide-tab" data-guide-tab="setup" role="tab" aria-selected="false">Setup guide</button>
              <button type="button" class="guide-tab" data-guide-tab="help" role="tab" aria-selected="false">Troubleshooting</button>
            </div>

            <div class="guide-panel is-active" data-guide-panel="why" role="tabpanel">
              <div class="guide-section-label">The problem this solves</div>
              <div class="guide-contrast">
                <div class="guide-contrast-item problem">
                  <div class="guide-contrast-title">Without this plugin</div>
                  <p class="guide-contrast-copy">You update a post, fix a typo, or publish urgent news, but visitors may still see Cloudflare's saved copy. WordPress changed, but the edge cache did not get the message.</p>
                </div>
                <div class="guide-contrast-item solution">
                  <div class="guide-contrast-title">With this plugin</div>
                  <p class="guide-contrast-copy">When you save content, WordPress asks Cloudflare to clear the old copy. Visitors get fresher pages without waiting for cache expiry.</p>
                </div>
              </div>

              <div class="guide-section-label">What it does</div>
              <div class="guide-features">
                <div class="guide-feature">
                  <span class="guide-feature-num">1</span>
                  <div class="guide-feature-title">Manual purge</div>
                  <p class="guide-feature-copy">Use the top button or WordPress admin bar when you want a clean full refresh.</p>
                </div>
                <div class="guide-feature">
                  <span class="guide-feature-num">2</span>
                  <div class="guide-feature-title">Auto purge on save</div>
                  <p class="guide-feature-copy">Post publish and update events clear the post URL and homepage automatically.</p>
                </div>
                <div class="guide-feature">
                  <span class="guide-feature-num">3</span>
                  <div class="guide-feature-title">Activity log</div>
                  <p class="guide-feature-copy">Each purge request is recorded so the owner can see success or failure quickly.</p>
                </div>
              </div>
            </div>

            <div class="guide-panel" data-guide-panel="setup" role="tabpanel">
              <div class="guide-done-banner" id="ccp-guide-done">All steps are marked done. Paste the credentials, save, then run one test purge.</div>

              <div class="guide-progress">
                <div class="guide-progress-track"><div class="guide-progress-bar" id="ccp-guide-progress"></div></div>
                <div class="guide-progress-label"><strong id="ccp-guide-progress-text">0</strong> of 5 done</div>
              </div>

              <p class="guide-copy guide-setup-intro">You need two things from Cloudflare: a <strong>Zone ID</strong> that identifies the website, and an <strong>API Token</strong> that lets this plugin ask Cloudflare to purge cache.</p>

              <div class="guide-steps" id="ccp-guide-steps">
                <div class="guide-step is-active" data-step="1">
                  <div class="guide-step-num">1</div>
                  <div class="guide-step-box">
                    <button type="button" class="guide-step-toggle">
                      <span class="guide-step-title">Log in to Cloudflare</span>
                      <span class="guide-chev">+</span>
                    </button>
                    <div class="guide-step-content">
                      <p>Open <a class="guide-link" href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer">dash.cloudflare.com</a> in a new tab and sign in.</p>
                      <div class="guide-hint">If you manage multiple accounts, choose the account that contains this WordPress site's domain.</div>
                      <div class="guide-step-actions"><button type="button" class="btn btn-dark guide-done" data-guide-done="1">Done</button></div>
                    </div>
                  </div>
                </div>

                <div class="guide-step" data-step="2">
                  <div class="guide-step-num">2</div>
                  <div class="guide-step-box">
                    <button type="button" class="guide-step-toggle">
                      <span class="guide-step-title">Select your website</span>
                      <span class="guide-chev">+</span>
                    </button>
                    <div class="guide-step-content">
                      <p>From the Cloudflare home screen, click the domain that matches your WordPress site.</p>
                      <div class="guide-hint">You should land on the domain Overview page. That is where the Zone ID is shown.</div>
                      <div class="guide-step-actions"><button type="button" class="btn btn-dark guide-done" data-guide-done="2">Done</button></div>
                    </div>
                  </div>
                </div>

                <div class="guide-step" data-step="3">
                  <div class="guide-step-num">3</div>
                  <div class="guide-step-box">
                    <button type="button" class="guide-step-toggle">
                      <span class="guide-step-title">Copy your Zone ID <span class="guide-badge">Required</span></span>
                      <span class="guide-chev">+</span>
                    </button>
                    <div class="guide-step-content">
                      <ol>
                        <li>Stay on the domain Overview page.</li>
                        <li>Find the API section on the right side.</li>
                        <li>Copy the value labelled <strong>Zone ID</strong>.</li>
                        <li>Paste it into the <strong>Zone ID</strong> field in the Configuration panel.</li>
                      </ol>
                      <div class="guide-hint">A Zone ID is a long string of letters and numbers, like <span class="guide-code">a1b2c3d4e5f67890</span>.</div>
                      <div class="guide-step-actions"><button type="button" class="btn btn-dark guide-done" data-guide-done="3">Done</button></div>
                    </div>
                  </div>
                </div>

                <div class="guide-step" data-step="4">
                  <div class="guide-step-num">4</div>
                  <div class="guide-step-box">
                    <button type="button" class="guide-step-toggle">
                      <span class="guide-step-title">Create an API token <span class="guide-badge">Required</span></span>
                      <span class="guide-chev">+</span>
                    </button>
                    <div class="guide-step-content">
                      <ol>
                        <li>Click your profile icon in the top right of Cloudflare.</li>
                        <li>Open <strong>My Profile</strong>, then <strong>API Tokens</strong>.</li>
                        <li>Click <strong>Create Token</strong>.</li>
                        <li>Use the <strong>Cache Purge</strong> template if Cloudflare shows it.</li>
                        <li>If that template is missing, choose <strong>Create Custom Token</strong>.</li>
                      </ol>
                      <div class="guide-hint">The Cache Purge template usually fills the correct permission for you. A custom token works too.</div>
                      <div class="guide-step-actions"><button type="button" class="btn btn-dark guide-done" data-guide-done="4">Done</button></div>
                    </div>
                  </div>
                </div>

                <div class="guide-step" data-step="5">
                  <div class="guide-step-num">5</div>
                  <div class="guide-step-box">
                    <button type="button" class="guide-step-toggle">
                      <span class="guide-step-title">Set permissions, copy, and save <span class="guide-badge">Important</span></span>
                      <span class="guide-chev">+</span>
                    </button>
                    <div class="guide-step-content">
                      <p>If you use a custom token, set this permission exactly:</p>
                      <table class="guide-perm">
                        <tr><th>Category</th><th>Subcategory</th><th>Permission</th><th>Applied to</th></tr>
                        <tr><td>Zone</td><td class="guide-val">Cache Purge</td><td class="guide-val">Purge</td><td>Specific zone -> your domain</td></tr>
                      </table>
                      <ol>
                        <li>Click <strong>Continue to summary</strong>, then <strong>Create Token</strong>.</li>
                        <li>Copy the token immediately. Cloudflare shows it only once.</li>
                        <li>Paste it into the <strong>API Token</strong> field in the Configuration panel.</li>
                        <li>Click <strong>Save</strong>, then run <strong>Purge Everything</strong> once to test.</li>
                      </ol>
                      <div class="guide-warning">Treat the API token like a password. If it is lost, delete it in Cloudflare and create a new one.</div>
                      <div class="guide-success">After a test purge, the Purge Log should show a green Success entry within a few seconds.</div>
                      <div class="guide-step-actions"><button type="button" class="btn btn-dark guide-done" data-guide-done="5">All done</button></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="guide-panel" data-guide-panel="help" role="tabpanel">
              <div class="guide-section-label">Common issues</div>
              <details class="guide-trouble">
                <summary>Purge succeeds but visitors still see old content</summary>
                <p>Cloudflare accepted the purge, but the visitor's browser or hosting server may still be caching the page. Ask them to hard refresh, and check whether your host has its own page cache.</p>
              </details>
              <details class="guide-trouble">
                <summary>Authentication error or 401 response</summary>
                <p>The API token is wrong, expired, missing permission, or pasted with extra spaces. Create a new Cloudflare token and paste it carefully.</p>
              </details>
              <details class="guide-trouble">
                <summary>Zone not found or 404 response</summary>
                <p>The Zone ID may not match the domain your token can access. Copy the Zone ID from the same domain that you selected while creating the token.</p>
              </details>
              <details class="guide-trouble">
                <summary>Homepage still looks stale after a post update</summary>
                <p>Use the manual full purge once. If it keeps happening, another cache layer may be serving the homepage, such as hosting cache or a separate optimization plugin.</p>
              </details>
              <details class="guide-trouble">
                <summary>No Cache Purge template appears in Cloudflare</summary>
                <p>Create a custom token instead. Give it Zone, Cache Purge, Purge permission for the specific domain.</p>
              </details>
            </div>

            <div class="guide-footer">
              <span>Official Cloudflare references</span>
              <span class="guide-links">
                <a class="guide-link" href="https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/" target="_blank" rel="noopener noreferrer">Zone ID</a>
                <a class="guide-link" href="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/" target="_blank" rel="noopener noreferrer">API token</a>
                <a class="guide-link" href="https://developers.cloudflare.com/api/operations/zone-purge/" target="_blank" rel="noopener noreferrer">Purge API</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  var purge=document.getElementById('ccp-purge-btn');
  if(purge){
    purge.addEventListener('click',function(){
      purge.classList.add('loading');
      var label=purge.querySelector('.purge-label');
      if(label) label.textContent='Purging...';
    });
  }

  var toggle=document.getElementById('ccp-token-toggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      var input=document.getElementById('ccp_token');
      if(!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  var infoCard=document.getElementById('ccp-info-card');
  var infoToggle=document.getElementById('ccp-info-toggle');
  var key='ccp_info_collapsed';
  function getStore(name){
    try { return localStorage.getItem(name); } catch(e) { return null; }
  }
  function setStore(name,value){
    try { localStorage.setItem(name,value); } catch(e) {}
  }
  function setInfo(collapsed){
    if(!infoCard || !infoToggle) return;
    var firstRun = infoCard.getAttribute('data-first-run') === '1';
    infoCard.classList.toggle('is-collapsed', collapsed);
    infoCard.classList.toggle('is-spotlight', firstRun && !collapsed);
    infoToggle.textContent = collapsed ? 'Read' : 'Minimize';
  }
  if(infoCard && infoToggle){
    var firstRun = infoCard.getAttribute('data-first-run') === '1';
    var saved=getStore(key);
    setInfo(saved === null ? !firstRun : saved === '1');
    infoToggle.addEventListener('click',function(){
      var collapsed = !infoCard.classList.contains('is-collapsed');
      setStore(key, collapsed ? '1' : '0');
      setInfo(collapsed);
    });
  }

  var guideTabs=document.querySelectorAll('#ccp-wrap .guide-tab');
  var guidePanels=document.querySelectorAll('#ccp-wrap .guide-panel');
  guideTabs.forEach(function(tab){
    tab.addEventListener('click',function(){
      var target=tab.getAttribute('data-guide-tab');
      guideTabs.forEach(function(item){
        var active=item===tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      guidePanels.forEach(function(panel){
        panel.classList.toggle('is-active', panel.getAttribute('data-guide-panel')===target);
      });
    });
  });

  var stepKey='ccp_guide_done_steps';
  var doneSteps={};
  var savedSteps=getStore(stepKey);
  if(savedSteps){
    try { doneSteps=JSON.parse(savedSteps) || {}; } catch(e) { doneSteps={}; }
  }
  function saveSteps(){
    setStore(stepKey, JSON.stringify(doneSteps));
  }
  function updateGuideProgress(){
    var total=5;
    var done=0;
    document.querySelectorAll('#ccp-wrap .guide-step').forEach(function(step){
      var id=step.getAttribute('data-step');
      var isDone=!!doneSteps[id];
      if(isDone) done++;
      step.classList.toggle('is-done', isDone);
      var num=step.querySelector('.guide-step-num');
      if(num) num.textContent=isDone ? 'OK' : id;
    });
    var pct=Math.round((done/total)*100);
    var bar=document.getElementById('ccp-guide-progress');
    var txt=document.getElementById('ccp-guide-progress-text');
    var meter=document.getElementById('ccp-guide-meter');
    var banner=document.getElementById('ccp-guide-done');
    if(bar) bar.style.width=pct+'%';
    if(txt) txt.textContent=done;
    if(meter) meter.textContent=done+'/'+total;
    if(banner) banner.classList.toggle('is-visible', done===total);
  }
  document.querySelectorAll('#ccp-wrap .guide-step-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){
      var step=btn.closest('.guide-step');
      if(!step) return;
      var willOpen=!step.classList.contains('is-active');
      document.querySelectorAll('#ccp-wrap .guide-step').forEach(function(item){
        if(item!==step) item.classList.remove('is-active');
      });
      step.classList.toggle('is-active', willOpen);
    });
  });
  document.querySelectorAll('#ccp-wrap .guide-done').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-guide-done');
      if(!id) return;
      doneSteps[id]=true;
      saveSteps();
      var current=document.querySelector('#ccp-wrap .guide-step[data-step="'+id+'"]');
      if(current) current.classList.remove('is-active');
      var nextId=String(parseInt(id,10)+1);
      var next=document.querySelector('#ccp-wrap .guide-step[data-step="'+nextId+'"]');
      if(next && !doneSteps[nextId]) next.classList.add('is-active');
      updateGuideProgress();
    });
  });
  updateGuideProgress();
})();
</script>
<?php
} // end ccp_render_page

// Save settings.
add_action('admin_post_ccp_save_settings', function () {
    if (!current_user_can('manage_options') || !check_admin_referer('ccp_save_settings')) wp_die('Unauthorized');
    update_option('ccp_token',   sanitize_text_field($_POST['ccp_token']));
    update_option('ccp_zone_id', sanitize_text_field($_POST['ccp_zone_id']));
    update_option('ccp_remote_purge_slug', ccp_sanitize_remote_purge_slug($_POST['ccp_remote_purge_slug'] ?? ''));
    $remote_password = isset($_POST['ccp_remote_purge_password']) ? trim((string) wp_unslash($_POST['ccp_remote_purge_password'])) : '';
    if (!empty($_POST['ccp_clear_remote_password'])) {
        delete_option('ccp_remote_purge_password_hash');
    } elseif ($remote_password !== '') {
        update_option('ccp_remote_purge_password_hash', wp_hash_password($remote_password));
    }
    wp_redirect(admin_url('admin.php?page=cloudflare-cache-logs&ccp_status=saved'));
    exit;
});
