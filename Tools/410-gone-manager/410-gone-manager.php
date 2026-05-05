<?php
/**
 * Plugin Name: 410 Gone Manager
 * Plugin URI: https://ankitjaiswal.in/
 * Description: Manage removed URLs with automatic 410 Gone responses, activity logs, bulk tools, CSV import/export, and SEO-safe cleanup.
 * Version: 1.3.1
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: Ankit Jaiswal (ankitjaiswal.in)
 * Author URI: https://ankitjaiswal.in/
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: 410-gone-manager
 */

if (!defined('ABSPATH')) exit;

class FGM_FourTenGoneManager {
    const VERSION = '1.3.1';

    private $data_option = 'fgm_managed_slugs';
    private $legacy_data_option = 'u410_managed_slugs';
    private $log_option  = 'fgm_activity_log';
    private $legacy_log_option  = 'u410_activity_log';
    private $candidate_option = 'fgm_404_candidates';
    private $enabled_option = 'fgm_engine_enabled';

    public function __construct() {
        $this->maybe_migrate_legacy_options();

        add_action('init',            [$this, 'enforce_410_rules'], 1);
        add_action('template_redirect', [$this, 'record_404_candidate'], 99);
        add_action('admin_menu',      [$this, 'add_menu']);
        add_action('admin_bar_menu',  [$this, 'add_admin_bar_shortcut'], 100);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);

        add_action('admin_post_save_410_manual',   [$this, 'handle_manual_add']);
        add_action('admin_post_delete_410_entry',  [$this, 'handle_delete']);
        add_action('admin_post_bulk_delete_410',   [$this, 'handle_bulk_delete']);
        add_action('admin_post_factory_reset_410', [$this, 'handle_factory_reset']);
        add_action('admin_post_export_410_csv',    [$this, 'handle_export']);
        add_action('admin_post_import_410_csv',    [$this, 'handle_import']);
        add_action('admin_post_fgm_404_candidates', [$this, 'handle_404_candidates']);
        add_action('admin_post_toggle_410_engine', [$this, 'handle_engine_toggle']);

        add_action('wp_trash_post',    [$this, 'auto_catch_deletion']);
        add_action('before_delete_post', [$this, 'auto_catch_deletion']);
        add_action('pre_delete_term',  [$this, 'auto_catch_term'], 10, 2);
        add_action('untrashed_post',   [$this, 'auto_recover_slug']);
        add_action('save_post',        [$this, 'prevent_duplicate_slug'], 10, 3);
    }

    private function maybe_migrate_legacy_options() {
        if (get_option($this->data_option, null) === null) {
            $legacy_data = get_option($this->legacy_data_option, null);
            if ($legacy_data !== null) {
                update_option($this->data_option, $legacy_data);
            }
        }

        if (get_option($this->log_option, null) === null) {
            $legacy_log = get_option($this->legacy_log_option, null);
            if ($legacy_log !== null) {
                update_option($this->log_option, $legacy_log);
            }
        }
    }

    private function is_engine_enabled() {
        return get_option($this->enabled_option, '1') !== '0';
    }

    // Core engine
    public function enforce_410_rules() {
        if (!$this->is_engine_enabled()) return;
        if (is_admin() || defined('DOING_AJAX') || defined('DOING_CRON')) return;
        $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
        if (!$path) return;
        $stored = get_option($this->data_option, []);
        
        $match = false;
        if (isset($stored[$path])) {
            $match = true;
        } else {
            foreach ($stored as $slug => $data) {
                if (strpos($slug, '*') !== false) {
                    $pattern = '/^' . str_replace('\*', '.*', preg_quote($slug, '/')) . '$/i';
                    if (preg_match($pattern, $path)) {
                        $match = true;
                        break;
                    }
                }
            }
        }
        
        if (!$match) return;
        status_header(410); nocache_headers();
        header('X-Robots-Tag: noindex, noarchive');
        echo '<!DOCTYPE html><html><head><title>410 Gone</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#fafafa;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}.w{max-width:360px;padding:40px 24px}.n{font-size:72px;font-weight:600;letter-spacing:-4px;line-height:1;margin-bottom:16px;color:#111}p{font-size:15px;color:#888;line-height:1.6}</style></head><body><div class="w"><div class="n">410</div><p>This page has been permanently removed and is no longer available.</p></div></body></html>';
        exit;
    }

    public function record_404_candidate() {
        if (!$this->is_engine_enabled()) return;
        if (is_admin() || defined('DOING_AJAX') || defined('DOING_CRON') || !is_404()) return;

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if (!in_array($method, ['GET', 'HEAD'], true)) return;

        $slug = $this->normalize_slug($_SERVER['REQUEST_URI'] ?? '');
        if (!$this->should_track_404_slug($slug)) return;

        $stored = get_option($this->data_option, []);
        if (isset($stored[$slug])) return;

        $lock_key = 'fgm_404_seen_' . md5($slug);
        if (get_transient($lock_key)) return;
        set_transient($lock_key, 1, 90);

        $now = time();
        $candidates = get_option($this->candidate_option, []);
        if (!is_array($candidates)) $candidates = [];

        $existing = isset($candidates[$slug]) && is_array($candidates[$slug]) ? $candidates[$slug] : [];
        $referrer = isset($_SERVER['HTTP_REFERER']) ? esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER'])) : '';

        $candidates[$slug] = [
            'first' => intval($existing['first'] ?? $now),
            'last'  => $now,
            'hits'  => intval($existing['hits'] ?? 0) + 1,
            'ref'   => $referrer ?: sanitize_text_field($existing['ref'] ?? ''),
        ];

        uasort($candidates, function($a, $b) {
            return intval($b['last'] ?? 0) <=> intval($a['last'] ?? 0);
        });

        update_option($this->candidate_option, array_slice($candidates, 0, 200, true));
    }

    private function normalize_slug($value) {
        $path = parse_url((string) $value, PHP_URL_PATH);
        if ($path === false || $path === null) $path = (string) $value;
        $path = rawurldecode($path);
        $path = preg_replace('#/+#', '/', $path);
        return sanitize_text_field(trim($path, "/ \t\n\r\0\x0B"));
    }

    private function should_track_404_slug($slug) {
        if (!$slug || strpos($slug, '*') !== false) return false;

        $lower = strtolower($slug);
        $blocked_prefixes = ['wp-admin', 'wp-content', 'wp-includes', 'wp-json', '.well-known'];
        foreach ($blocked_prefixes as $prefix) {
            if ($lower === $prefix || strpos($lower, $prefix . '/') === 0) return false;
        }

        $blocked_exact = ['wp-login.php', 'xmlrpc.php', 'favicon.ico', 'robots.txt'];
        if (in_array($lower, $blocked_exact, true)) return false;
        if (strpos($lower, 'sitemap') === 0) return false;

        if (preg_match('/\.(css|js|map|json|xml|jpg|jpeg|png|gif|webp|svg|ico|avif|bmp|woff|woff2|ttf|eot|mp4|mp3|webm|mov|avi)$/i', $lower)) {
            return false;
        }

        return true;
    }

    // Assets
    public function enqueue_assets($hook) {
        if ($hook !== 'tools_page_410-gone-manager') return;
        wp_enqueue_style('fgm-sora', 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap', [], null);
    }

    // Helpers
    private function get_local_time($ts = null) {
        return wp_date('M j, g:i A', $ts ?: time());
    }

    private function log_event($msg) {
        $logs = get_option($this->log_option, []);
        array_unshift($logs, ['t' => time(), 'msg' => sanitize_text_field($msg)]);
        update_option($this->log_option, array_slice($logs, 0, 20));
    }

    public function auto_catch_term($term_id, $taxonomy) {
        if (!$this->is_engine_enabled()) return;
        $link = get_term_link($term_id, $taxonomy);
        if (is_wp_error($link)) return;
        $path = trim(parse_url($link, PHP_URL_PATH) ?? '', '/');
        if (!$path) return;
        
        $term = get_term($term_id, $taxonomy);
        $title = $term && !is_wp_error($term) ? $term->name : 'Term';
        
        $stored = get_option($this->data_option, []);
        if (isset($stored[$path])) return;
        $stored[$path] = ['time' => time(), 'title' => 'Category/Tag: ' . $title];
        update_option($this->data_option, $stored);
        $this->log_event("Auto-added /{$path}/");
    }

    public function auto_catch_deletion($post_id) {
        if (!$this->is_engine_enabled()) return;
        $post = get_post($post_id);
        if (!$post || in_array($post->post_status, ['auto-draft']) || $post->post_type === 'revision') return;
        $stored = get_option($this->data_option, []);
        if (isset($stored[$post->post_name])) return;
        $stored[$post->post_name] = ['time' => time(), 'title' => $post->post_title];
        update_option($this->data_option, $stored);
        $this->log_event("Auto-added /{$post->post_name}/");
    }

    public function auto_recover_slug($post_id) {
        if (!$this->is_engine_enabled()) return;
        $post = get_post($post_id);
        if (!$post) return;
        $this->remove_slug_safely($post->post_name, "Restored /{$post->post_name}/");
    }

    public function prevent_duplicate_slug($post_id, $post, $update) {
        if (!$this->is_engine_enabled()) return;
        if ($post->post_status !== 'publish') return;
        $this->remove_slug_safely($post->post_name, "Republished /{$post->post_name}/");
    }

    private function remove_slug_safely($slug, $log_msg) {
        $stored = get_option($this->data_option, []);
        if (!isset($stored[$slug])) return;
        unset($stored[$slug]);
        update_option($this->data_option, $stored);
        $this->log_event($log_msg);
    }

    // Handlers
    public function handle_manual_add() {
        check_admin_referer('add_410_action');
        if (!current_user_can('manage_options')) return;
        $raw    = preg_split('/\r\n|\r|\n/', sanitize_textarea_field($_POST['slugs']));
        $stored = get_option($this->data_option, []);
        $added  = 0;
        foreach ($raw as $line) {
            $s = trim(trim(parse_url($line, PHP_URL_PATH) ?? ''), '/');
            if (!$s || isset($stored[$s])) continue;
            $stored[$s] = ['time' => time(), 'title' => 'Manual Override'];
            $added++;
        }
        if ($added) { update_option($this->data_option, $stored); $this->log_event("Manually added {$added} URL(s)"); }
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=added&count=' . $added)); exit;
    }

    public function handle_delete() {
        check_admin_referer('delete_410_action');
        if (!current_user_can('manage_options')) return;
        $slug = sanitize_text_field($_GET['slug']);
        $this->remove_slug_safely($slug, "Removed /{$slug}/");
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=deleted&recovered=' . urlencode($slug))); exit;
    }

    public function handle_bulk_delete() {
        check_admin_referer('bulk_410_action');
        if (!current_user_can('manage_options') || empty($_POST['fgm_bulk_slugs'])) return;
        $stored = get_option($this->data_option, []);
        $slugs  = array_map('sanitize_text_field', $_POST['fgm_bulk_slugs']);
        $count  = 0;
        foreach ($slugs as $s) { if (isset($stored[$s])) { unset($stored[$s]); $count++; } }
        if ($count) { update_option($this->data_option, $stored); $this->log_event("Bulk removed {$count} URL(s)"); }
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=bulk_deleted&count=' . $count)); exit;
    }

    public function handle_factory_reset() {
        check_admin_referer('reset_410_action');
        if (!current_user_can('manage_options')) return;
        update_option($this->data_option, []);
        update_option($this->log_option, []);
        update_option($this->candidate_option, []);
        update_option($this->enabled_option, '1');
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=reset')); exit;
    }

    public function handle_export() {
        if (!current_user_can('manage_options')) return;
        $data = get_option($this->data_option, []);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="410-gone-export-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Slug', 'Title', 'Timestamp']);
        foreach ($data as $slug => $item) {
            fputcsv($out, [$slug, is_array($item) ? $item['title'] : 'Legacy', is_array($item) ? $item['time'] : $item]);
        }
        fclose($out); exit;
    }

    public function handle_import() {
        check_admin_referer('import_410_action');
        if (!current_user_can('manage_options') || empty($_FILES['fgm_file']['tmp_name'])) {
            wp_redirect(admin_url('tools.php?page=410-gone-manager&status=import_failed')); exit;
        }
        $file   = fopen($_FILES['fgm_file']['tmp_name'], 'r');
        $stored = get_option($this->data_option, []);
        $added  = 0; $first = true;
        while (($row = fgetcsv($file)) !== false) {
            if ($first && strtolower($row[0]) === 'slug') { $first = false; continue; }
            $slug = sanitize_text_field(trim($row[0] ?? '', '/ '));
            if (!$slug || isset($stored[$slug])) continue;
            $stored[$slug] = ['time' => (isset($row[2]) && is_numeric($row[2])) ? intval($row[2]) : time(), 'title' => sanitize_text_field($row[1] ?? 'Imported')];
            $added++;
        }
        fclose($file);
        if ($added) { update_option($this->data_option, $stored); $this->log_event("Imported {$added} URL(s) from CSV"); }
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=imported&count=' . $added)); exit;
    }

    public function handle_404_candidates() {
        check_admin_referer('fgm_404_candidates_action');
        if (!current_user_can('manage_options')) return;

        $action = sanitize_text_field($_POST['fgm_candidate_action'] ?? 'convert');
        $slugs = isset($_POST['fgm_404_slugs']) && is_array($_POST['fgm_404_slugs']) ? $_POST['fgm_404_slugs'] : [];
        $slugs = array_values(array_filter(array_map(function($slug) {
            return $this->normalize_slug(wp_unslash($slug));
        }, $slugs)));

        if (empty($slugs)) {
            wp_redirect(admin_url('tools.php?page=410-gone-manager&status=no_404_selected')); exit;
        }

        $candidates = get_option($this->candidate_option, []);
        if (!is_array($candidates)) $candidates = [];

        $stored = get_option($this->data_option, []);
        if (!is_array($stored)) $stored = [];

        $count = 0;
        foreach ($slugs as $slug) {
            if (!isset($candidates[$slug])) continue;

            if ($action === 'ignore') {
                unset($candidates[$slug]);
                $count++;
                continue;
            }

            if (!isset($stored[$slug])) {
                $stored[$slug] = ['time' => time(), 'title' => '404 Discovery Candidate'];
                $count++;
            }
            unset($candidates[$slug]);
        }

        update_option($this->candidate_option, $candidates);

        if ($action === 'ignore') {
            if ($count) $this->log_event("Ignored {$count} discovered 404 candidate(s)");
            wp_redirect(admin_url('tools.php?page=410-gone-manager&status=ignored_404&count=' . $count)); exit;
        }

        if ($count) {
            update_option($this->data_option, $stored);
            $this->log_event("Converted {$count} discovered 404 candidate(s) to 410");
        }
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=converted_404&count=' . $count)); exit;
    }

    public function handle_engine_toggle() {
        check_admin_referer('toggle_410_engine_action');
        if (!current_user_can('manage_options')) return;

        $target = sanitize_text_field($_POST['fgm_engine_state'] ?? 'active');
        $enabled = $target !== 'paused';
        update_option($this->enabled_option, $enabled ? '1' : '0');

        $this->log_event($enabled ? 'Protection engine resumed' : 'Protection engine paused');
        wp_redirect(admin_url('tools.php?page=410-gone-manager&status=' . ($enabled ? 'engine_active' : 'engine_paused'))); exit;
    }

    // Admin bar
    public function add_admin_bar_shortcut($ab) {
        if (current_user_can('manage_options'))
            $ab->add_node(['id' => 'fgm-410-gone-manager', 'title' => '410 Gone Manager', 'href' => admin_url('tools.php?page=410-gone-manager')]);
    }

    public function add_menu() {
        add_management_page('410 Gone Manager', '410 Gone Manager', 'manage_options', '410-gone-manager', [$this, 'render_ui']);
    }

    // UI
    public function render_ui() {
        $engine_enabled = $this->is_engine_enabled();
        $data = get_option($this->data_option, []);
        $logs = get_option($this->log_option, []);
        $candidates = get_option($this->candidate_option, []);
        if (!is_array($candidates)) $candidates = [];
        foreach (array_keys($candidates) as $candidate_slug) {
            if (isset($data[$candidate_slug])) unset($candidates[$candidate_slug]);
        }
        uasort($candidates, function($a, $b) {
            $hit_compare = intval($b['hits'] ?? 0) <=> intval($a['hits'] ?? 0);
            if ($hit_compare !== 0) return $hit_compare;
            return intval($b['last'] ?? 0) <=> intval($a['last'] ?? 0);
        });
        $candidate_total = count($candidates);
        $candidate_rows = array_slice($candidates, 0, 10, true);
        uasort($data, function($a, $b) {
            return (is_array($b) ? $b['time'] : $b) <=> (is_array($a) ? $a['time'] : $a);
        });
        $total = count($data);
        $guide_spotlight = ($total === 0 && $candidate_total === 0);

        $js_data = [];
        foreach ($data as $slug => $item) {
            $ts    = is_array($item) ? $item['time'] : $item;
            $title = is_array($item) ? $item['title'] : 'Legacy';
            $type = 'post';
            if (strpos($title, 'Category/Tag:') !== false) $type = 'category';
            elseif (strpos(strtolower($title), 'page') !== false) $type = 'page';
            
            $js_data[] = [
                'slug' => $slug,
                'url' => '/' . $slug . '/',
                'type' => $type,
                'label' => $title,
                'date' => $this->get_local_time($ts),
                'del_url' => html_entity_decode(wp_nonce_url(admin_url('admin-post.php?action=delete_410_entry&slug='.$slug), 'delete_410_action')),
                'live_url' => home_url('/'.$slug.'/')
            ];
        }
?>
<!DOCTYPE html>
<style>
/* CSS Reset + Variables */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

#fgm-wrap {
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
  --fgm-admin-bar-offset: 0px;
  --fgm-sticky-gap: 8px;
  --easeSpring: cubic-bezier(0.16,1,0.3,1);
  --easeOut:    cubic-bezier(0.0,0,0.2,1);

  font-family: 'Sora', system-ui, sans-serif;
  background: var(--bg);
  color: var(--t1);
  box-sizing: border-box;
  margin: 0 -20px 0;
  padding-top: var(--fgm-sticky-gap);
  min-height: calc(100vh - var(--fgm-sticky-gap));
}

#fgm-wrap * { box-sizing: border-box; }

body.wp-admin #fgm-wrap,
body.admin-bar #fgm-wrap { --fgm-admin-bar-offset: 32px; }

@media screen and (max-width: 782px) {
  body.wp-admin #fgm-wrap,
  body.admin-bar #fgm-wrap { --fgm-admin-bar-offset: 46px; }
}

#fgm-wrap .shell { display: flex; min-height: calc(100vh - var(--fgm-sticky-gap)); }

#fgm-wrap .sb {
  width: 216px; flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  height: calc(100vh - var(--fgm-admin-bar-offset) - var(--fgm-sticky-gap)); overflow-y: auto;
  position: sticky; top: calc(var(--fgm-admin-bar-offset) + var(--fgm-sticky-gap));
}

#fgm-wrap .sb-brand {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}

#fgm-wrap .sb-mark {
  width: 30px; height: 30px; flex-shrink: 0;
  background: var(--t1);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}

#fgm-wrap .sb-mark::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%);
  pointer-events: none;
}

#fgm-wrap .sb-mark span {
  font-family: 'Sora', sans-serif;
  font-size: 10px; font-weight: 600;
  color: #fff; letter-spacing: -0.3px; line-height: 1;
}

#fgm-wrap .sb-name { font-size: 13px; font-weight: 600; color: var(--t1); letter-spacing: -0.3px; line-height: 1.2; }
#fgm-wrap .sb-sub { font-size: 10.5px; color: var(--t3); font-weight: 400; margin-top: 2px; }

#fgm-wrap .sb-nav { padding: 10px 0; flex: 1; }
#fgm-wrap .sb-sec {
  padding: 10px 16px 4px;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--t4);
}

#fgm-wrap .sb-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; margin: 1px 8px;
  border-radius: 6px;
  color: var(--t2); cursor: pointer;
  transition: background 130ms ease, color 130ms ease, transform 100ms ease;
  font-size: 12.5px; font-weight: 400;
  position: relative; user-select: none;
}

#fgm-wrap .sb-item:hover { background: var(--bg); color: var(--t1); }
#fgm-wrap .sb-item:active { transform: scale(0.98); }
#fgm-wrap .sb-item.on { background: var(--t1); color: #fff; font-weight: 500; }
#fgm-wrap .sb-item.on::before {
  content: ''; position: absolute; left: -8px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 16px; background: #fff; border-radius: 0 2px 2px 0; opacity: 0.35;
}
#fgm-wrap .sb-item svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.65; }
#fgm-wrap .sb-item.on svg { opacity: 1; }

#fgm-wrap .sb-badge {
  margin-left: auto; font-size: 10px; font-weight: 600;
  padding: 2px 6px; border-radius: 4px;
  background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd);
  white-space: nowrap; flex-shrink: 0;
}
#fgm-wrap .sb-item.on .sb-badge {
  background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.18);
}

#fgm-wrap .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

#fgm-wrap .topbar {
  height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0 28px; display: flex; align-items: center; gap: 14px;
  position: sticky; top: calc(var(--fgm-admin-bar-offset) + var(--fgm-sticky-gap)); z-index: 20;
}
#fgm-wrap .topbar-title { font-size: 13.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.3px; white-space: nowrap; }
#fgm-wrap .topbar-title em { font-family: 'Times New Roman', Times, serif; font-style: italic; font-weight: 400; font-size: 14px; color: var(--t2); }
#fgm-wrap .topbar-divider { width: 1px; height: 16px; background: var(--border); flex-shrink: 0; }
#fgm-wrap .engine-tag { font-size: 11px; color: var(--t3); display: flex; align-items: center; gap: 5px; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .engine-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; animation: dot-pulse 2.8s cubic-bezier(0.4,0,0.6,1) infinite; }
#fgm-wrap .engine-dot.off { background: var(--amber); animation: none; }
@keyframes dot-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(21,128,61,0)} 50%{box-shadow:0 0 0 4px rgba(21,128,61,0.15)} }
#fgm-wrap .topbar-sep { flex: 1; }
#fgm-wrap .topbar-acts { display: flex; align-items: center; gap: 8px; }
#fgm-wrap .engine-toggle-form { margin: 0; display: inline-flex; flex-shrink: 0; }
#fgm-wrap .engine-toggle {
  height: 32px; border: 1px solid var(--green-bd); background: var(--green-bg); color: var(--green);
  border-radius: 999px; padding: 0 10px 0 6px; display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 600;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 180ms ease, transform 100ms ease;
}
#fgm-wrap .engine-toggle:hover { box-shadow: 0 6px 18px rgba(21,128,61,0.09); transform: translateY(-1px); }
#fgm-wrap .engine-toggle:active { transform: scale(0.98); }
#fgm-wrap .engine-toggle.off { background: var(--amber-bg); border-color: var(--amber-bd); color: var(--amber); }
#fgm-wrap .engine-toggle.off:hover { box-shadow: 0 6px 18px rgba(180,83,9,0.1); }
#fgm-wrap .toggle-track { width: 36px; height: 22px; border-radius: 999px; background: rgba(21,128,61,0.16); border: 1px solid rgba(21,128,61,0.2); position: relative; flex-shrink: 0; }
#fgm-wrap .engine-toggle.off .toggle-track { background: rgba(180,83,9,0.16); border-color: rgba(180,83,9,0.2); }
#fgm-wrap .toggle-knob { position: absolute; top: 3px; left: 17px; width: 14px; height: 14px; border-radius: 50%; background: currentColor; box-shadow: 0 2px 7px rgba(24,23,15,0.16); transition: left 180ms var(--easeSpring); }
#fgm-wrap .engine-toggle.off .toggle-knob { left: 3px; }
#fgm-wrap .toggle-copy { line-height: 1; }

#fgm-wrap .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 0 14px; height: 32px; border-radius: 7px;
  font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background 130ms ease, border-color 130ms ease, color 130ms ease, transform 100ms ease, box-shadow 150ms ease;
  border: 1px solid transparent; font-family: inherit; white-space: nowrap; position: relative; overflow: hidden;
  text-decoration: none; line-height: 1;
}
#fgm-wrap .btn:active { transform: scale(0.97); }
#fgm-wrap .btn-ghost { background: transparent; border-color: var(--border); color: var(--t2); }
#fgm-wrap .btn-ghost:hover { background: var(--bg); border-color: var(--border-md); color: var(--t1); }
#fgm-wrap .btn-primary { background: var(--t1); border-color: var(--t1); color: #fff; }
#fgm-wrap .btn-primary:hover { background: #2D2C24; }
#fgm-wrap .btn-primary:focus-visible, #fgm-wrap .btn-ghost:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(24,23,15,0.12); }
#fgm-wrap .btn-icon svg { width: 12px; height: 12px; }

@keyframes spin { to{transform:rotate(360deg)} }
#fgm-wrap .btn-spinner { width: 12px; height: 12px; border: 1.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }

#fgm-wrap .content { padding: 24px 28px 32px; display: grid; grid-template-columns: 1fr 272px; gap: 20px; align-items: start; }

@keyframes bar-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
#fgm-wrap .prot-bar {
  grid-column: 1/-1; background: var(--green-bg); border: 1px solid var(--green-bd); border-radius: 8px;
  padding: 9px 14px; display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--green); font-weight: 500;
  animation: bar-in 350ms var(--easeSpring) 80ms both;
}
#fgm-wrap .prot-bar.paused { background: var(--amber-bg); border-color: var(--amber-bd); color: var(--amber); }
#fgm-wrap .prot-bar-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); flex-shrink: 0; position: relative; }
#fgm-wrap .prot-bar-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: rgba(21,128,61,0.2); animation: dot-pulse 3s ease-in-out infinite; }
#fgm-wrap .prot-bar.paused .prot-bar-dot { background: var(--amber); }
#fgm-wrap .prot-bar.paused .prot-bar-dot::after { background: rgba(180,83,9,0.18); animation: none; }
#fgm-wrap .prot-bar-right { margin-left: auto; font-size: 11px; font-weight: 400; color: rgba(21,128,61,0.65); white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .prot-bar.paused .prot-bar-right { color: rgba(180,83,9,0.72); }

@keyframes card-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
#fgm-wrap .stats { grid-column: 1/-1; display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
#fgm-wrap .stat {
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px;
  transition: border-color 180ms var(--easeSpring), transform 180ms var(--easeSpring), box-shadow 180ms var(--easeSpring);
  animation: card-in 400ms var(--easeSpring) both;
}
#fgm-wrap .stat:nth-child(1) { animation-delay: 100ms }
#fgm-wrap .stat:nth-child(2) { animation-delay: 160ms }
#fgm-wrap .stat:nth-child(3) { animation-delay: 220ms }
#fgm-wrap .stat:nth-child(4) { animation-delay: 280ms }
#fgm-wrap .stat:hover { border-color: var(--border-md); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(24,23,15,0.06); }
#fgm-wrap .stat-lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--t3); margin-bottom: 10px; }
#fgm-wrap .stat-val { font-size: 30px; font-weight: 600; color: var(--t1); letter-spacing: -1.2px; line-height: 1; margin-bottom: 8px; font-family: 'Sora', sans-serif; }
#fgm-wrap .stat-val.green { color: var(--green); }
#fgm-wrap .stat-val.amber { color: var(--amber); }
#fgm-wrap .stat-val.engine { font-size: 16px; font-weight: 600; letter-spacing: -0.4px; margin-top: 4px; }
#fgm-wrap .stat-foot { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--t3); flex-wrap: nowrap; }
#fgm-wrap .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .chip.green { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd); }
#fgm-wrap .chip.amber { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }

#fgm-wrap .discovery-card { grid-column: 1/-1; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; animation: tbl-in 400ms var(--easeSpring) 280ms both; }
#fgm-wrap .discovery-card.has-candidates { border-color: var(--amber-bd); box-shadow: 0 10px 34px rgba(180,83,9,0.06); }
#fgm-wrap .discovery-head { padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#FFFFFF 0%,#FEFCF8 100%); }
#fgm-wrap .discovery-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber); margin-bottom: 5px; }
#fgm-wrap .discovery-title { font-size: 14px; font-weight: 600; color: var(--t1); letter-spacing: -0.28px; display: flex; align-items: center; gap: 8px; }
#fgm-wrap .discovery-title svg { width: 14px; height: 14px; color: var(--amber); flex-shrink: 0; }
#fgm-wrap .discovery-copy { font-size: 11.5px; color: var(--t2); line-height: 1.65; margin-top: 6px; max-width: 760px; }
#fgm-wrap .discovery-count { min-width: 86px; height: 54px; border-radius: 8px; background: var(--amber-bg); border: 1px solid var(--amber-bd); color: var(--amber); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 600; flex-shrink: 0; }
#fgm-wrap .discovery-count strong { color: var(--t1); font-size: 20px; line-height: 1; letter-spacing: -0.6px; margin-bottom: 4px; }
#fgm-wrap .discovery-empty { padding: 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; background: var(--surface); }
#fgm-wrap .discovery-empty-text { font-size: 11.5px; color: var(--t3); line-height: 1.6; }
#fgm-wrap .discovery-table-wrap { overflow-x: auto; }
#fgm-wrap .discovery-card tbody tr { cursor: default; }
#fgm-wrap .candidate-check { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
#fgm-wrap .candidate-check input { display: none; }
#fgm-wrap .candidate-check input:checked + .chk-box { background: var(--t1); border-color: var(--t1); }
#fgm-wrap .candidate-check input:checked + .chk-box:after { content: ""; width: 8px; height: 5px; border-left: 1.5px solid #fff; border-bottom: 1.5px solid #fff; transform: rotate(-45deg) translate(1px,-1px); }
#fgm-wrap .candidate-path { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--t1); font-weight: 500; }
#fgm-wrap .candidate-meta { font-size: 10.5px; color: var(--t3); margin-top: 3px; line-height: 1.45; }
#fgm-wrap .candidate-hits { font-size: 12px; font-weight: 600; color: var(--t1); }
#fgm-wrap .s-pill.candidate { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }
#fgm-wrap .discovery-footer { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
#fgm-wrap .discovery-note { font-size: 11px; color: var(--t3); line-height: 1.5; }
#fgm-wrap .discovery-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

#fgm-wrap .guide-card { grid-column: 1/-1; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; animation: tbl-in 400ms var(--easeSpring) 240ms both; }
#fgm-wrap .guide-card.is-spotlight { border-color: rgba(24,23,15,0.2); box-shadow: 0 18px 60px rgba(24,23,15,0.08); }
#fgm-wrap .guide-head { padding: 15px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#FFFFFF 0%,#FEFCF8 100%); }
#fgm-wrap .guide-title { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.25px; }
#fgm-wrap .guide-title svg { width: 14px; height: 14px; color: var(--t3); flex-shrink: 0; }
#fgm-wrap .guide-kicker { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--t3); margin-bottom: 5px; }
#fgm-wrap .guide-sub { font-size: 11.5px; line-height: 1.6; color: var(--t2); margin-top: 6px; max-width: 780px; }
#fgm-wrap .guide-toggle { height: 28px; padding: 0 10px; font-size: 11px; flex-shrink: 0; }
#fgm-wrap .guide-body { padding: 0; }
#fgm-wrap .guide-card.is-collapsed .guide-body { display: none; }
#fgm-wrap .guide-card.is-collapsed .guide-head { border-bottom-color: transparent; }
#fgm-wrap .guide-tabs { display: flex; gap: 4px; padding: 10px; border-bottom: 1px solid var(--border); background: var(--bg); overflow-x: auto; }
#fgm-wrap .guide-tab { height: 31px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--t2); font: inherit; font-size: 11.5px; font-weight: 600; padding: 0 11px; cursor: pointer; white-space: nowrap; transition: background 130ms ease, border-color 130ms ease, color 130ms ease; }
#fgm-wrap .guide-tab:hover { color: var(--t1); background: rgba(255,255,255,0.55); }
#fgm-wrap .guide-tab.is-active { color: var(--t1); background: var(--surface); border-color: var(--border); box-shadow: 0 1px 2px rgba(24,23,15,0.04); }
#fgm-wrap .guide-panel { display: none; padding: 18px; }
#fgm-wrap .guide-panel.is-active { display: block; }
#fgm-wrap .guide-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
#fgm-wrap .guide-cardlet { border: 1px solid var(--border); border-radius: 9px; background: var(--surface-2); padding: 14px; }
#fgm-wrap .guide-cardlet.green { background: var(--green-bg); border-color: var(--green-bd); }
#fgm-wrap .guide-cardlet.amber { background: var(--amber-bg); border-color: var(--amber-bd); }
#fgm-wrap .guide-cardlet.blue { background: var(--blue-bg); border-color: var(--blue-bd); }
#fgm-wrap .guide-cardlet-title { font-size: 12px; font-weight: 600; color: var(--t1); margin-bottom: 5px; }
#fgm-wrap .guide-cardlet-copy { font-size: 11.5px; line-height: 1.65; color: var(--t2); margin: 0; }
#fgm-wrap .guide-section-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--t3); margin: 0 0 10px; }
#fgm-wrap .guide-section-label:not(:first-child) { margin-top: 16px; }
#fgm-wrap .guide-decision-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }
#fgm-wrap .guide-decision { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 12px; }
#fgm-wrap .guide-decision .chip { margin-bottom: 8px; }
#fgm-wrap .guide-decision-title { font-size: 12px; font-weight: 600; color: var(--t1); margin-bottom: 4px; }
#fgm-wrap .guide-decision-copy { font-size: 10.5px; line-height: 1.55; color: var(--t3); margin: 0; }
#fgm-wrap .guide-flow { display: grid; gap: 8px; }
#fgm-wrap .guide-flow-row { display: grid; grid-template-columns: 24px minmax(0,1fr); gap: 10px; align-items: start; }
#fgm-wrap .guide-flow-num { width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; background: var(--bg); border: 1px solid var(--border); color: var(--t2); font-size: 10px; font-weight: 700; }
#fgm-wrap .guide-flow-title { font-size: 12px; font-weight: 600; color: var(--t1); margin-bottom: 2px; }
#fgm-wrap .guide-flow-copy { font-size: 10.5px; line-height: 1.55; color: var(--t3); }
#fgm-wrap .guide-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--border); background: var(--bg); padding: 12px 18px; font-size: 10.5px; color: var(--t3); }
#fgm-wrap .guide-links { display: flex; gap: 10px; flex-wrap: wrap; }
#fgm-wrap .guide-link { color: var(--t1); text-decoration: none; font-weight: 600; }
#fgm-wrap .guide-link:hover { text-decoration: underline; }

@media (max-width: 1180px) {
  #fgm-wrap .stats { grid-template-columns: repeat(2,1fr); }
  #fgm-wrap .guide-decision-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}

@media (max-width: 900px) {
  #fgm-wrap .content { grid-template-columns: 1fr; padding: 18px 16px 28px; }
  #fgm-wrap .topbar { overflow-x: auto; padding: 0 16px; gap: 10px; }
  #fgm-wrap .stats { grid-template-columns: 1fr; }
  #fgm-wrap .guide-head { align-items: flex-start; flex-direction: column; }
  #fgm-wrap .guide-grid, #fgm-wrap .guide-decision-grid { grid-template-columns: 1fr; }
  #fgm-wrap .guide-toggle { width: 100%; }
  #fgm-wrap .discovery-head, #fgm-wrap .discovery-empty, #fgm-wrap .discovery-footer { align-items: flex-start; flex-direction: column; }
  #fgm-wrap .discovery-actions { width: 100%; flex-direction: column; }
  #fgm-wrap .discovery-actions .btn { width: 100%; }
}

@keyframes tbl-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
#fgm-wrap .tbl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; animation: tbl-in 400ms var(--easeSpring) 300ms both; }
#fgm-wrap .tbl-head { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
#fgm-wrap .tbl-title { font-size: 13px; font-weight: 600; color: var(--t1); letter-spacing: -0.25px; }
#fgm-wrap .tbl-count { font-size: 11px; color: var(--t3); font-weight: 500; background: var(--bg); border: 1px solid var(--border); padding: 2px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .search-wrap { position: relative; margin-left: auto; }
#fgm-wrap .search-input {
  background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0 10px 0 29px;
  height: 30px; font-size: 12px; color: var(--t1); width: 176px; font-family: inherit; outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease, width 220ms var(--easeSpring);
}
#fgm-wrap .search-input:hover { border-color: var(--border-md); }
#fgm-wrap .search-input:focus { border-color: var(--border-dk); box-shadow: 0 0 0 3px rgba(24,23,15,0.07); width: 200px; }
#fgm-wrap .search-input::placeholder { color: var(--t4); }
#fgm-wrap .search-ico { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.35; }

#fgm-wrap table { width: 100%; border-collapse: collapse; margin: 0; padding: 0; }
#fgm-wrap thead th { padding: 7px 16px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.055em; text-transform: uppercase; color: var(--t3); background: var(--bg); border-bottom: 1px solid var(--border); text-align: left; }
#fgm-wrap thead th:last-child { text-align: right; }
#fgm-wrap tbody tr { border-bottom: 1px solid var(--border); transition: background 100ms linear; cursor: pointer; }
#fgm-wrap tbody tr:last-child { border-bottom: none; }
#fgm-wrap tbody tr:hover { background: #FAFAF7; }

#fgm-wrap tbody tr:hover .act-btn { pointer-events: auto; }
#fgm-wrap tbody tr.selected { background: #F5F3EE; }
#fgm-wrap td { padding: 11px 16px; vertical-align: middle; }
#fgm-wrap .chk-col { width: 36px; padding-right: 0; }
#fgm-wrap .chk-box {
  min-width: 16px; min-height: 16px; width: 16px; height: 16px; border: 1.5px solid var(--border-dk); border-radius: 4px; background: var(--surface);
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 130ms ease, border-color 130ms ease; flex-shrink: 0;
}
#fgm-wrap .chk-box:hover { border-color: var(--border-dk); }
#fgm-wrap .path-wrap { display: flex; flex-direction: column; gap: 4px; }
#fgm-wrap .path-url { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 500; color: var(--t1); letter-spacing: -0.3px; line-height: 1.2; }
#fgm-wrap .path-meta { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--t3); flex-wrap: nowrap; }
#fgm-wrap .type-tag { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .type-tag.page { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }
#fgm-wrap .type-tag.category { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-bd); }
#fgm-wrap .type-tag.post { background: var(--bg); color: var(--t2); border: 1px solid var(--border); }
#fgm-wrap .s-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 6px; border-radius: 5px; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .s-pill.active { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-bd); }
#fgm-wrap .s-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
@keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.45} }
#fgm-wrap .s-pill.active .s-dot { animation: breathe 3s ease-in-out infinite; }
#fgm-wrap .date-td { font-size: 11.5px; color: var(--t3); white-space: nowrap; }
#fgm-wrap .row-acts { display: flex; align-items: center; gap: 4px; justify-content: flex-end; opacity: 1; }
#fgm-wrap .act-btn {
  display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
  height: 26px; padding: 0 9px; border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--t2);
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 100ms ease; font-family: inherit; pointer-events: none; white-space: nowrap;
}
#fgm-wrap .act-btn:hover { background: var(--bg); border-color: var(--border-md); color: var(--t1); }
#fgm-wrap .act-btn:active { transform: scale(0.96); }
#fgm-wrap .act-btn.remove:hover { background: var(--red-bg); border-color: var(--red-bd); color: var(--red); }

#fgm-wrap .bulk-bar {
  display: none; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid var(--border); background: var(--bg); border-radius: 0 0 10px 10px;
}
#fgm-wrap .bulk-bar.visible { display: flex; }

#fgm-wrap .panels { display: flex; flex-direction: column; gap: 16px; }
#fgm-wrap .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; animation: card-in 400ms var(--easeSpring) both; }
#fgm-wrap .panel:nth-child(1) { animation-delay: 200ms }
#fgm-wrap .panel:nth-child(2) { animation-delay: 250ms }
#fgm-wrap .panel:nth-child(3) { animation-delay: 300ms }
#fgm-wrap .panel-hd { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
#fgm-wrap .panel-title { font-size: 12.5px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
#fgm-wrap .panel-title svg { width: 12px; height: 12px; color: var(--t3); }
#fgm-wrap .panel-count { font-size: 11px; color: var(--t3); white-space: nowrap; }
#fgm-wrap .panel-bd { padding: 14px 16px; }

#fgm-wrap .cmd-area {
  width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--t1); resize: none; height: 78px; line-height: 1.65; outline: none; display: block;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
#fgm-wrap .cmd-area:hover { border-color: var(--border-md); }
#fgm-wrap .cmd-area:focus { border-color: var(--border-dk); box-shadow: 0 0 0 3px rgba(24,23,15,0.07); }
#fgm-wrap .cmd-area::placeholder { color: var(--t4); }
#fgm-wrap .cmd-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }
#fgm-wrap .cmd-hint { font-size: 10.5px; color: var(--t3); line-height: 1.5; }
#fgm-wrap .cmd-count { font-size: 10.5px; color: var(--t4); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
#fgm-wrap .inject-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 34px; margin-top: 10px;
  background: var(--t1); color: #fff; border: 1px solid var(--t1); border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
  transition: background 130ms ease, transform 100ms ease, border-color 200ms ease; letter-spacing: -0.1px; overflow: hidden; position: relative;
}
#fgm-wrap .inject-btn:hover { background: #2D2C24; }
#fgm-wrap .inject-btn:active { transform: scale(0.97); }

@keyframes act-in { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
#fgm-wrap .act-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); align-items: flex-start; opacity: 0; animation: act-in 280ms var(--easeSpring) both; }
#fgm-wrap .act-item:last-child { border-bottom: none; padding-bottom: 0; }
#fgm-wrap .act-item:first-child { padding-top: 0; }
#fgm-wrap .act-item:nth-child(1) { animation-delay: 350ms }
#fgm-wrap .act-item:nth-child(2) { animation-delay: 390ms }
#fgm-wrap .act-item:nth-child(3) { animation-delay: 430ms }
#fgm-wrap .act-item:nth-child(4) { animation-delay: 470ms }
#fgm-wrap .act-item:nth-child(5) { animation-delay: 510ms }
#fgm-wrap .act-item:nth-child(6) { animation-delay: 550ms }
#fgm-wrap .act-ico { width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
#fgm-wrap .act-ico.add { background: var(--green-bg); }
#fgm-wrap .act-ico.rep { background: var(--amber-bg); }
#fgm-wrap .act-ico.rm { background: var(--red-bg); }
#fgm-wrap .act-ico svg { width: 9px; height: 9px; }
#fgm-wrap .act-body { flex: 1; min-width: 0; }
#fgm-wrap .act-path { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 500; color: var(--t1); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; }
#fgm-wrap .act-detail { font-size: 10.5px; color: var(--t3); margin-top: 2px; display: flex; align-items: center; gap: 5px; }
#fgm-wrap .act-verb { font-size: 10px; font-weight: 600; padding: 0px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
#fgm-wrap .act-verb.add { background: var(--green-bg); color: var(--green); }
#fgm-wrap .act-verb.rep { background: var(--amber-bg); color: var(--amber); }
#fgm-wrap .act-verb.rm { background: var(--red-bg); color: var(--red); }

#fgm-wrap .trail-empty { padding: 2px 0 4px; }
#fgm-wrap .trail-empty-head { display: grid; grid-template-columns: 32px minmax(0,1fr); gap: 10px; align-items: center; margin-bottom: 12px; }
#fgm-wrap .trail-empty-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--t2); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); }
#fgm-wrap .trail-empty-icon svg { width: 15px; height: 15px; }
#fgm-wrap .trail-empty-title { font-size: 12px; font-weight: 600; color: var(--t1); letter-spacing: -0.2px; margin-bottom: 3px; }
#fgm-wrap .trail-empty-copy { font-size: 10.5px; line-height: 1.55; color: var(--t3); }
#fgm-wrap .trail-skeleton { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: linear-gradient(180deg,#FFFFFF 0%,#FEFCF8 100%); }
#fgm-wrap .trail-sk-row { display: grid; grid-template-columns: 20px minmax(0,1fr) 48px; gap: 9px; align-items: center; padding: 9px 10px; border-bottom: 1px solid var(--border); }
#fgm-wrap .trail-sk-row:last-child { border-bottom: none; }
#fgm-wrap .trail-sk-dot { width: 18px; height: 18px; border-radius: 5px; background: var(--green-bg); border: 1px solid var(--green-bd); position: relative; overflow: hidden; }
#fgm-wrap .trail-sk-stack { display: grid; gap: 6px; min-width: 0; }
#fgm-wrap .trail-line, #fgm-wrap .trail-pill { position: relative; overflow: hidden; display: block; max-width: 100%; border-radius: 999px; background: #EDEAE2; }
#fgm-wrap .trail-line:after, #fgm-wrap .trail-pill:after, #fgm-wrap .trail-sk-dot:after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent); animation: fgm-skeleton 1.8s ease-in-out infinite; }
#fgm-wrap .trail-line.w1 { width: 112px; height: 9px; }
#fgm-wrap .trail-line.w2 { width: 76px; height: 7px; opacity: 0.72; }
#fgm-wrap .trail-line.w3 { width: 92px; height: 9px; }
#fgm-wrap .trail-line.w4 { width: 64px; height: 7px; opacity: 0.72; }
#fgm-wrap .trail-pill { justify-self: end; width: 40px; height: 18px; border-radius: 5px; background: var(--bg); border: 1px solid var(--border); }
@keyframes fgm-skeleton { 100% { transform: translateX(100%); } }

#fgm-wrap .danger { background: var(--red-bg); border: 1px solid var(--red-bd); border-radius: 10px; padding: 14px 16px; }
#fgm-wrap .danger-title { font-size: 12px; font-weight: 600; color: var(--red); margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
#fgm-wrap .danger-title svg { width: 13px; height: 13px; }
#fgm-wrap .danger-copy { font-size: 11px; color: #7F1D1D; line-height: 1.55; margin-bottom: 12px; }
#fgm-wrap .reset-btn {
  width: 100%; height: 32px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px;
  font-size: 11.5px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 100ms ease;
  border: 1px solid var(--red-bd); background: var(--surface); color: var(--red); white-space: nowrap;
}
#fgm-wrap .reset-btn svg { width: 14px; height: 14px; flex-shrink: 0; display: block; overflow: visible; }
#fgm-wrap .reset-btn:hover { background: var(--red); color: #fff; border-color: var(--red); }
#fgm-wrap .reset-btn:active { transform: scale(0.97); }
#fgm-wrap .reset-btn.confirming { display: none; }
#fgm-wrap .reset-confirm { display: none; background: var(--red); border: 1px solid #991B1B; border-radius: 7px; padding: 10px 12px; margin-top: 10px; font-size: 11px; color: #fff; line-height: 1.5; animation: card-in 200ms var(--easeSpring); }
#fgm-wrap .reset-confirm.show { display: block; }
#fgm-wrap .reset-confirm strong { font-weight: 600; }
#fgm-wrap .reset-confirm-row { display: flex; gap: 8px; margin-top: 10px; }
#fgm-wrap .reset-cancel, #fgm-wrap .reset-go { flex: 1; height: 28px; border-radius: 5px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 130ms ease; display: inline-flex; align-items: center; justify-content: center; border: none; text-decoration: none; }
#fgm-wrap .reset-cancel { border: 1px solid rgba(255,255,255,0.3); background: transparent; color: #fff; }
#fgm-wrap .reset-cancel:hover { background: rgba(255,255,255,0.12); }
#fgm-wrap .reset-go { border: 1px solid rgba(0,0,0,0.2); background: #fff; color: var(--red); font-weight: 600; }
#fgm-wrap .reset-go:hover { background: #FEF2F2; }

@keyframes row-in { from{opacity:0} to{opacity:1} }
#fgm-wrap tbody tr { animation: row-in 300ms ease both; }

/* WP Admin Notice Adjustments */
#fgm-wrap .wp-notice {
  background: var(--green-bg); border: 1px solid var(--green-bd); border-radius: 8px;
  padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;
  font-size: 12px; font-weight: 500; color: var(--green); animation: bar-in 300ms var(--easeSpring);
}
</style>

<div id="fgm-wrap">
  <div class="shell">

    <!-- MAIN -->
    <div class="main">

      <!-- TOPBAR -->
      <header class="topbar">
        <span class="topbar-title">410 <em>Gone</em> Management</span>
        <div class="topbar-divider"></div>
        <div class="engine-tag">
          <div class="engine-dot <?php echo $engine_enabled ? '' : 'off'; ?>"></div>
          PHP Engine &middot; <?php echo $engine_enabled ? 'Site Protected' : 'Protection Paused'; ?>
        </div>
        <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" class="engine-toggle-form" id="engineToggleForm">
          <?php wp_nonce_field('toggle_410_engine_action'); ?>
          <input type="hidden" name="action" value="toggle_410_engine">
          <input type="hidden" name="fgm_engine_state" value="<?php echo $engine_enabled ? 'paused' : 'active'; ?>">
          <button type="submit" class="engine-toggle <?php echo $engine_enabled ? '' : 'off'; ?>" aria-pressed="<?php echo $engine_enabled ? 'true' : 'false'; ?>">
            <span class="toggle-track" aria-hidden="true"><span class="toggle-knob"></span></span>
            <span class="toggle-copy">Engine <?php echo $engine_enabled ? 'On' : 'Off'; ?></span>
          </button>
        </form>
        <div class="topbar-sep"></div>
        <div class="topbar-acts">
          <a href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=export_410_csv'), 'export_410_action')); ?>" class="btn btn-ghost btn-icon">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M8 2v10M4 10l4 4 4-4"/></svg>
            Export CSV
          </a>
          <button class="btn btn-primary btn-icon" onclick="document.getElementById('cmd-input').focus()">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>
            Add Rule
          </button>
        </div>
      </header>

      <!-- CONTENT -->
      <div class="content">

        <!-- NOTICES -->
        <?php if (isset($_GET['status'])): ?>
        <div class="wp-notice" style="grid-column: 1/-1;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <?php
          $s = $_GET['status'];
          if ($s === 'added')         echo '<span>Added ' . intval($_GET['count'] ?? 0) . ' URL(s) successfully.</span>';
          elseif ($s === 'deleted')   echo '<span>Rule removed for <strong>/' . esc_html(wp_unslash($_GET['recovered'] ?? '')) . '/</strong></span>';
          elseif ($s === 'bulk_deleted') echo '<span>Removed ' . intval($_GET['count'] ?? 0) . ' rule(s).</span>';
          elseif ($s === 'imported')  echo '<span>Imported ' . intval($_GET['count'] ?? 0) . ' URL(s) from CSV.</span>';
          elseif ($s === 'converted_404') echo '<span>Converted ' . intval($_GET['count'] ?? 0) . ' discovered 404 candidate(s) into 410 rules.</span>';
          elseif ($s === 'ignored_404') echo '<span>Ignored ' . intval($_GET['count'] ?? 0) . ' discovered 404 candidate(s).</span>';
          elseif ($s === 'no_404_selected') echo '<span>Select at least one 404 candidate before running an action.</span>';
          elseif ($s === 'engine_paused') echo '<span>Protection engine paused. The public site now behaves as if 410 Gone Manager is not installed.</span>';
          elseif ($s === 'engine_active') echo '<span>Protection engine resumed. Managed rules and 404 discovery are active again.</span>';
          elseif ($s === 'reset')     echo '<span>System reset. All rules and logs cleared.</span>';
          ?>
        </div>
        <?php endif; ?>

        <!-- PROTECTION BAR -->
        <div class="prot-bar <?php echo $engine_enabled ? '' : 'paused'; ?>">
          <div class="prot-bar-dot"></div>
          <span><?php echo $engine_enabled ? "{$total} rules enforced &mdash; all incoming 410 signals are being handled correctly." : "Protection engine is paused &mdash; 410 responses, 404 discovery, and automatic captures are disabled."; ?></span>
          <div class="prot-bar-right"><?php echo $engine_enabled ? 'Runtime active' : 'Runtime bypassed'; ?></div>
        </div>

        <!-- STATS -->
        <div class="stats">
          <div class="stat">
            <div class="stat-lbl">Rules Enforced</div>
            <div class="stat-val <?php echo $engine_enabled ? 'green' : 'amber'; ?>"><?php echo $total; ?></div>
            <div class="stat-foot">
              <span class="chip <?php echo $engine_enabled ? 'green' : 'amber'; ?>"><?php echo $engine_enabled ? 'Active' : 'Paused'; ?></span>
              <span><?php echo $engine_enabled ? 'paths returning 410' : 'rules saved, not enforced'; ?></span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-lbl">Activity Log</div>
            <div class="stat-val"><?php echo count($logs); ?></div>
            <div class="stat-foot">
              <span>events recorded</span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-lbl">Engine Mode</div>
            <div class="stat-val engine"><?php echo $engine_enabled ? 'PHP Engine' : 'Paused'; ?></div>
            <div class="stat-foot">
              <span class="chip <?php echo $engine_enabled ? 'green' : 'amber'; ?>"><?php echo $engine_enabled ? 'Active' : 'Off'; ?></span>
              <span><?php echo $engine_enabled ? 'auto-detect on' : 'site bypass mode'; ?></span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-lbl">404 Discovery</div>
            <div class="stat-val <?php echo $candidate_total ? 'amber' : ''; ?>"><?php echo $candidate_total; ?></div>
            <div class="stat-foot">
              <span class="chip <?php echo !$engine_enabled || $candidate_total ? 'amber' : 'green'; ?>"><?php echo !$engine_enabled ? 'Paused' : ($candidate_total ? 'Review' : 'Quiet'); ?></span>
              <span><?php echo $engine_enabled ? 'candidate URLs' : 'not listening'; ?></span>
            </div>
          </div>
        </div>

        <!-- STRATEGY GUIDE -->
        <div class="guide-card <?php echo $guide_spotlight ? 'is-spotlight' : 'is-collapsed'; ?>" id="fgm-guide-card" data-first-run="<?php echo $guide_spotlight ? '1' : '0'; ?>">
          <div class="guide-head">
            <div>
              <span class="guide-kicker">Search engine signal</span>
              <div class="guide-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 16 16"><path d="M3 4h10M3 8h7M3 12h5"/><path d="M12 10l2 2-2 2"/></svg>
                410 Strategy Guide
              </div>
              <div class="guide-sub">A 410 is not just an error page. It is a permanent-removal signal for URLs that should not return, should not redirect, and should not stay indexable.</div>
            </div>
            <button type="button" class="btn btn-ghost guide-toggle" id="fgm-guide-toggle"><?php echo $guide_spotlight ? 'Minimize' : 'Read'; ?></button>
          </div>

          <div class="guide-body">
            <div class="guide-tabs" role="tablist" aria-label="410 strategy guide">
              <button type="button" class="guide-tab is-active" data-guide-tab="importance" role="tab" aria-selected="true">Why it matters</button>
              <button type="button" class="guide-tab" data-guide-tab="decision" role="tab" aria-selected="false">When to use 410</button>
              <button type="button" class="guide-tab" data-guide-tab="workflow" role="tab" aria-selected="false">Plugin workflow</button>
            </div>

            <div class="guide-panel is-active" data-guide-panel="importance" role="tabpanel">
              <div class="guide-section-label">How search engines read it</div>
              <div class="guide-grid">
                <div class="guide-cardlet green">
                  <div class="guide-cardlet-title">Google</div>
                  <p class="guide-cardlet-copy">Google says `4xx` URLs are not considered for indexing, and previously indexed `4xx` URLs are removed. For content that is gone with no replacement, Google recommends returning `404` or `410` instead of a soft 404.</p>
                </div>
                <div class="guide-cardlet blue">
                  <div class="guide-cardlet-title">Bing</div>
                  <p class="guide-cardlet-copy">Bing describes dead links as URLs returning error status codes and says it wants to remove those from search results. Bing's URL Submission API also accepts dead links such as `404` and `410` so Bing can learn those URLs are gone.</p>
                </div>
              </div>

              <div class="guide-section-label">Why this plugin exists</div>
              <div class="guide-grid">
                <div class="guide-cardlet">
                  <div class="guide-cardlet-title">Avoid soft 404 confusion</div>
                  <p class="guide-cardlet-copy">A page that says "not found" but returns `200` can look alive to crawlers. This plugin sends the real HTTP status code.</p>
                </div>
                <div class="guide-cardlet">
                  <div class="guide-cardlet-title">Keep removals auditable</div>
                  <p class="guide-cardlet-copy">Every managed URL stays visible in WordPress, with activity logs, CSV tools, 404 discovery, and a master pause switch.</p>
                </div>
              </div>
            </div>

            <div class="guide-panel" data-guide-panel="decision" role="tabpanel">
              <div class="guide-section-label">Decision rules</div>
              <div class="guide-decision-grid">
                <div class="guide-decision">
                  <span class="chip green">Use 410</span>
                  <div class="guide-decision-title">Gone forever</div>
                  <p class="guide-decision-copy">Use when the URL had real content, was intentionally removed, and has no close replacement.</p>
                </div>
                <div class="guide-decision">
                  <span class="chip amber">Use 301</span>
                  <div class="guide-decision-title">Moved or replaced</div>
                  <p class="guide-decision-copy">Redirect if another page satisfies the same user intent. Do not 410 useful legacy demand.</p>
                </div>
                <div class="guide-decision">
                  <span class="chip amber">Use 404</span>
                  <div class="guide-decision-title">Unknown or temporary</div>
                  <p class="guide-decision-copy">Use 404 when the URL may be a typo, may return later, or was never intentionally published.</p>
                </div>
                <div class="guide-decision">
                  <span class="chip green">Do nothing</span>
                  <div class="guide-decision-title">Live content</div>
                  <p class="guide-decision-copy">Never add active, redirected, cart, account, search, API, or asset URLs as 410 rules.</p>
                </div>
              </div>
            </div>

            <div class="guide-panel" data-guide-panel="workflow" role="tabpanel">
              <div class="guide-section-label">How to use this dashboard</div>
              <div class="guide-flow">
                <div class="guide-flow-row"><span class="guide-flow-num">1</span><div><div class="guide-flow-title">Let automatic capture work</div><div class="guide-flow-copy">Deleted posts, deleted terms, and republished slugs are handled by the plugin so common cleanup stays quiet.</div></div></div>
                <div class="guide-flow-row"><span class="guide-flow-num">2</span><div><div class="guide-flow-title">Review 404 Discovery</div><div class="guide-flow-copy">Convert only candidates that are permanently gone. Ignore typos, bot noise, and URLs that should redirect somewhere useful.</div></div></div>
                <div class="guide-flow-row"><span class="guide-flow-num">3</span><div><div class="guide-flow-title">Use Manual Override for known removals</div><div class="guide-flow-copy">Paste old URLs or slugs when you already know they should return 410.</div></div></div>
                <div class="guide-flow-row"><span class="guide-flow-num">4</span><div><div class="guide-flow-title">Pause only when testing</div><div class="guide-flow-copy">The Protection Engine toggle makes the public site behave as if the plugin is not installed, while keeping rules saved.</div></div></div>
              </div>
            </div>

            <div class="guide-footer">
              <span>Reference docs</span>
              <span class="guide-links">
                <a class="guide-link" href="https://developers.google.com/search/docs/advanced/crawling/http-network-errors" target="_blank" rel="noopener noreferrer">Google status codes</a>
                <a class="guide-link" href="https://developers.google.com/search/blog/2011/05/do-404s-hurt-my-site" target="_blank" rel="noopener noreferrer">Google 404/410 guidance</a>
                <a class="guide-link" href="https://www.bing.com/webmasters/url-submission-api?source=card" target="_blank" rel="noopener noreferrer">Bing dead links</a>
                <a class="guide-link" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/410" target="_blank" rel="noopener noreferrer">MDN 410</a>
              </span>
            </div>
          </div>
        </div>

        <!-- 404 DISCOVERY -->
        <div class="discovery-card <?php echo $candidate_total ? 'has-candidates' : 'is-empty'; ?>">
          <div class="discovery-head">
            <div>
              <div class="discovery-kicker">Review before converting</div>
              <div class="discovery-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/><path d="M7 4.8v2.6M7 9.4v.1"/></svg>
                404 Discovery
              </div>
              <div class="discovery-copy"><?php echo $engine_enabled ? 'The plugin listens for real public 404 responses and turns them into reviewable candidates. Nothing becomes a 410 until you select the URLs and approve the conversion.' : 'Discovery is paused with the protection engine. Existing candidates remain available for review, but new 404 requests will not be recorded.'; ?></div>
            </div>
            <div class="discovery-count">
              <strong><?php echo $candidate_total; ?></strong>
              candidates
            </div>
          </div>

          <?php if (empty($candidate_rows)): ?>
            <div class="discovery-empty">
              <div class="discovery-empty-text">No 404 candidates yet. Discovery is active in the background and ignores WordPress admin, API, sitemap, and asset requests so the list stays useful.</div>
              <span class="chip <?php echo $engine_enabled ? 'green' : 'amber'; ?>"><?php echo $engine_enabled ? 'Listening' : 'Paused'; ?></span>
            </div>
          <?php else: ?>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
              <?php wp_nonce_field('fgm_404_candidates_action'); ?>
              <input type="hidden" name="action" value="fgm_404_candidates">
              <div class="discovery-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th class="chk-col"></th>
                      <th>Candidate URL</th>
                      <th>Signals</th>
                      <th>Last Seen</th>
                      <th style="text-align:right">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php foreach ($candidate_rows as $slug => $item):
                      $hits = intval($item['hits'] ?? 0);
                      $first = intval($item['first'] ?? time());
                      $last = intval($item['last'] ?? time());
                      $ref = sanitize_text_field($item['ref'] ?? '');
                    ?>
                    <tr>
                      <td class="chk-col">
                        <label class="candidate-check">
                          <input type="checkbox" name="fgm_404_slugs[]" value="<?php echo esc_attr($slug); ?>">
                          <span class="chk-box"></span>
                        </label>
                      </td>
                      <td>
                        <div class="candidate-path">/<?php echo esc_html($slug); ?>/</div>
                        <div class="candidate-meta">
                          First seen <?php echo esc_html($this->get_local_time($first)); ?><?php echo $ref ? ' &middot; Referrer recorded' : ''; ?>
                        </div>
                      </td>
                      <td><span class="candidate-hits"><?php echo $hits; ?></span> <span class="candidate-meta"><?php echo $hits === 1 ? 'hit' : 'hits'; ?></span></td>
                      <td class="date-td"><?php echo esc_html($this->get_local_time($last)); ?></td>
                      <td style="text-align:right"><span class="s-pill candidate"><span class="s-dot"></span>Review</span></td>
                    </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
              <div class="discovery-footer">
                <div class="discovery-note">
                  Showing <?php echo count($candidate_rows); ?> of <?php echo $candidate_total; ?> candidate(s). Convert only URLs that are permanently gone and have no better redirect target.
                </div>
                <div class="discovery-actions">
                  <button type="submit" name="fgm_candidate_action" value="ignore" class="btn btn-ghost">Ignore Selected</button>
                  <button type="submit" name="fgm_candidate_action" value="convert" class="btn btn-primary">Convert Selected to 410</button>
                </div>
              </div>
            </form>
          <?php endif; ?>
        </div>

        <!-- PATH TABLE -->
        <div class="tbl-card">
          <div class="tbl-head">
            <span class="tbl-title">Managed Paths</span>
            <span class="tbl-count" id="path-count"><?php echo $total; ?> active</span>
            <div class="search-wrap">
              <svg class="search-ico" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
              <input class="search-input" type="text" placeholder="Search paths&hellip;" id="path-search" oninput="doSearch(this.value)" autocomplete="off" spellcheck="false">
            </div>
          </div>
          <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" id="bulkForm">
            <?php wp_nonce_field('bulk_410_action'); ?>
            <input type="hidden" name="action" value="bulk_delete_410">
            <table>
              <thead>
                <tr>
                  <th class="chk-col"><div class="chk-box" id="chkAll" onclick="toggleAll()"></div></th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th style="text-align:right"></th>
                </tr>
              </thead>
              <tbody id="path-tbody"></tbody>
            </table>
            <div class="bulk-bar" id="bulkBar">
              <span style="font-size:11px; color:var(--t2); font-weight:500;" id="bulkCount">0 selected</span>
              <button type="submit" class="btn btn-ghost" style="color:var(--red); border-color:var(--red-bd); height:28px;">Remove Selected</button>
            </div>
          </form>
        </div>

        <!-- RIGHT PANELS -->
        <div class="panels">

          <!-- Manual Override -->
          <div class="panel">
            <div class="panel-hd">
              <span class="panel-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" width="12" height="12"><path d="M3 4h10M3 8h7M3 12h5"/><path d="M12 10l2 2-2 2"/></svg>
                Manual Override
              </span>
            </div>
            <div class="panel-bd">
              <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <?php wp_nonce_field('add_410_action'); ?>
                <input type="hidden" name="action" value="save_410_manual">
                <textarea name="slugs" class="cmd-area" id="cmd-input" placeholder="/old-page&#10;/another-removed-post" oninput="updateCount()" spellcheck="false" required></textarea>
                <div class="cmd-meta">
                  <div class="cmd-hint">One URL or slug per line.</div>
                  <div class="cmd-count" id="cmd-count">0 paths</div>
                </div>
                <button type="submit" class="inject-btn" id="inject-btn" onclick="doInject(this)">
                  <div class="btn-spinner" style="display:none" id="inj-spin"></div>
                  <svg id="inj-ico" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  <span class="inject-btn-text" id="inj-txt">Inject Rule</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Activity Trail -->
          <div class="panel">
            <div class="panel-hd">
              <span class="panel-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" width="12" height="12"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5l2 1.5"/></svg>
                Activity Trail
              </span>
              <span class="panel-count"><?php echo count($logs); ?> events</span>
            </div>
            <div class="panel-bd" style="padding:10px 16px; max-height:280px; overflow-y:auto;">
              <?php if (empty($logs)): ?>
                <div class="trail-empty">
                  <div class="trail-empty-head">
                    <div class="trail-empty-icon" aria-hidden="true">
                      <svg fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5l2 1.5"/></svg>
                    </div>
                    <div>
                      <div class="trail-empty-title">Waiting for first activity</div>
                      <div class="trail-empty-copy">Adds, conversions, imports, pauses, and removals will appear here.</div>
                    </div>
                  </div>
                  <div class="trail-skeleton" aria-hidden="true">
                    <div class="trail-sk-row">
                      <span class="trail-sk-dot"></span>
                      <span class="trail-sk-stack"><span class="trail-line w1"></span><span class="trail-line w2"></span></span>
                      <span class="trail-pill"></span>
                    </div>
                    <div class="trail-sk-row">
                      <span class="trail-sk-dot"></span>
                      <span class="trail-sk-stack"><span class="trail-line w3"></span><span class="trail-line w4"></span></span>
                      <span class="trail-pill"></span>
                    </div>
                    <div class="trail-sk-row">
                      <span class="trail-sk-dot"></span>
                      <span class="trail-sk-stack"><span class="trail-line w1"></span><span class="trail-line w4"></span></span>
                      <span class="trail-pill"></span>
                    </div>
                  </div>
                </div>
              <?php else: ?>
                <?php foreach (array_slice($logs, 0, 10) as $l): 
                    $msg = $l['msg'] ?? $l['m'] ?? 'Event';
                    $is_add = strpos($msg, 'Added') !== false || strpos($msg, 'Auto-added') !== false || strpos($msg, 'Imported') !== false;
                    $is_rm = strpos($msg, 'Removed') !== false || strpos($msg, 'Bulk') !== false;
                    $verb_class = $is_add ? 'add' : ($is_rm ? 'rm' : 'rep');
                    $verb_text = $is_add ? 'Added' : ($is_rm ? 'Removed' : 'Changed');
                    if (strpos($msg, 'Restored') !== false) { $verb_class = 'rep'; $verb_text = 'Restored'; }
                    if (strpos($msg, 'Republished') !== false) { $verb_class = 'rep'; $verb_text = 'Republished'; }
                    if (strpos($msg, 'CSV') !== false) { $verb_class = 'add'; $verb_text = 'Imported'; }
                ?>
                <div class="act-item">
                  <div class="act-ico <?php echo $verb_class; ?>">
                    <?php if ($verb_class === 'add'): ?>
                      <svg fill="none" stroke="#15803D" stroke-width="2" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>
                    <?php elseif ($verb_class === 'rm'): ?>
                      <svg fill="none" stroke="#DC2626" stroke-width="2" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13"/></svg>
                    <?php else: ?>
                      <svg fill="none" stroke="#B45309" stroke-width="2" viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.5-3.5M3 3v5h5"/></svg>
                    <?php endif; ?>
                  </div>
                  <div class="act-body">
                    <span class="act-path"><?php echo esc_html($msg); ?></span>
                    <div class="act-detail"><span class="act-verb <?php echo $verb_class; ?>"><?php echo $verb_text; ?></span> <?php echo $this->get_local_time($l['t'] ?? time()); ?></div>
                  </div>
                </div>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>
          </div>

          <!-- Data Migration -->
          <div class="panel">
            <div class="panel-hd">
              <span class="panel-title">
                <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4M7 4L3 8l4 4"/></svg>
                Data Migration
              </span>
            </div>
            <div class="panel-bd" style="display:flex;flex-direction:column;gap:8px;">
              <a href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=export_410_csv'), 'export_410_action')); ?>" class="btn btn-ghost" style="width:100%;justify-content:center;font-size:11.5px;">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M8 2v10M4 10l4 4 4-4"/></svg>
                Export CSV
              </a>
              <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" enctype="multipart/form-data" style="width:100%; margin:0;">
                <?php wp_nonce_field('import_410_action'); ?>
                <input type="hidden" name="action" value="import_410_csv">
                <label class="btn btn-ghost" style="width:100%;justify-content:center;font-size:11.5px;border-style:dashed;margin:0;">
                  <input type="file" name="fgm_file" accept=".csv" required style="display:none;" onchange="this.form.submit()">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M8 12V2M4 6l4-4 4 4"/></svg>
                  Import CSV
                </label>
              </form>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="danger">
            <div class="danger-title">
              <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" width="13" height="13"><path d="M8 2L1.5 14h13L8 2z"/><path d="M8 7v2.5M8 11.5v.5"/></svg>
              Danger Zone
            </div>
            <div class="danger-copy">Permanently wipes all managed rules and activity logs. Cannot be undone.</div>
            <button class="reset-btn" id="reset-btn" onclick="confirmReset(event)">
              <svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>
              <span id="reset-txt">Factory Reset</span>
            </button>
            <div class="reset-confirm" id="reset-confirm">
              <strong>Are you absolutely sure?</strong> This will delete all rules and activity log entries.
              <div class="reset-confirm-row">
                <button class="reset-cancel" type="button" onclick="cancelReset()">Cancel</button>
                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" style="margin:0;flex:1;">
                  <?php wp_nonce_field('reset_410_action'); ?>
                  <input type="hidden" name="action" value="factory_reset_410">
                  <button type="submit" class="reset-go" style="width:100%">Yes, reset everything</button>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</div>

<script>
const ALL = <?php echo json_encode($js_data); ?>;
const typeLabel = {page:'Page', category:'Category', post:'Post'};
let allChecked = false;

function fgmGetStore(name) {
  try { return localStorage.getItem(name); } catch(e) { return null; }
}

function fgmSetStore(name, value) {
  try { localStorage.setItem(name, value); } catch(e) {}
}

const guideCard = document.getElementById('fgm-guide-card');
const guideToggle = document.getElementById('fgm-guide-toggle');
const guideKey = 'fgm_strategy_guide_collapsed';
function setGuide(collapsed) {
  if (!guideCard || !guideToggle) return;
  const firstRun = guideCard.getAttribute('data-first-run') === '1';
  guideCard.classList.toggle('is-collapsed', collapsed);
  guideCard.classList.toggle('is-spotlight', firstRun && !collapsed);
  guideToggle.textContent = collapsed ? 'Read' : 'Minimize';
}
if (guideCard && guideToggle) {
  const firstRun = guideCard.getAttribute('data-first-run') === '1';
  const saved = fgmGetStore(guideKey);
  setGuide(saved === null ? !firstRun : saved === '1');
  guideToggle.addEventListener('click', function() {
    const collapsed = !guideCard.classList.contains('is-collapsed');
    fgmSetStore(guideKey, collapsed ? '1' : '0');
    setGuide(collapsed);
  });
}

document.querySelectorAll('#fgm-wrap .guide-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    const target = tab.getAttribute('data-guide-tab');
    document.querySelectorAll('#fgm-wrap .guide-tab').forEach(function(item) {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#fgm-wrap .guide-panel').forEach(function(panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-guide-panel') === target);
    });
  });
});

const engineToggleForm = document.getElementById('engineToggleForm');
if (engineToggleForm) {
  engineToggleForm.addEventListener('submit', function(e) {
    const stateInput = engineToggleForm.querySelector('input[name="fgm_engine_state"]');
    const target = stateInput ? stateInput.value : '';
    if (target === 'paused') {
      const ok = window.confirm('Pause Protection Engine? Public 410 responses, 404 discovery, and automatic captures will stop until you turn it back on.');
      if (!ok) e.preventDefault();
    }
  });
}

function renderRows(data) {
  const tb = document.getElementById('path-tbody');
  document.getElementById('path-count').textContent = data.length + ' active';
  
  if (data.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px 0;color:var(--t3);font-size:12px;">No rules found.</td></tr>';
    return;
  }

  let html = '';
  data.forEach((p, i) => {
    const delay = i * 20;
    html += `
      <tr onclick="toggleRow(this, '${p.slug}')" style="animation-delay:${delay}ms">
        <td class="chk-col">
          <div class="chk-box" id="chk-${p.slug}"></div>
          <input type="checkbox" name="fgm_bulk_slugs[]" value="${p.slug}" id="cb-${p.slug}" style="display:none;" class="real-cb">
        </td>
        <td>
          <div class="path-wrap">
            <span class="path-title" style="font-family:'Sora', sans-serif; font-size:12.5px; font-weight:600; color:var(--t1); letter-spacing:-0.2px;">${p.label !== 'Legacy' ? p.label : 'Removed Page'}</span>
            <div class="path-meta" style="margin-top:2px;">
              <span class="type-tag ${p.type}">${typeLabel[p.type] || 'Post'}</span>
              <span style="font-family:'JetBrains Mono', monospace; font-size:11px;">${p.url}</span>
            </div>
          </div>
        </td>
        <td><span class="s-pill active"><span class="s-dot"></span>410 Active</span></td>
        <td class="date-td">${p.date}</td>
        <td>
          <div class="row-acts">
            <a href="${p.live_url}" target="_blank" class="act-btn" onclick="event.stopPropagation()">Verify</a>
            <a href="${p.del_url}" class="act-btn remove" onclick="event.stopPropagation()">Remove</a>
          </div>
        </td>
      </tr>
    `;
  });
  tb.innerHTML = html;
  updateBulk();
}

function toggleRow(tr, slug) {
  tr.classList.toggle('selected');
  const chk = tr.querySelector('.chk-box');
  const cb = document.getElementById('cb-' + slug);
  if (tr.classList.contains('selected')) {
    chk.style.background = 'var(--t1)';
    chk.style.borderColor = 'var(--t1)';
    chk.innerHTML = '<svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(cb) cb.checked = true;
  } else {
    chk.style.background = '';
    chk.style.borderColor = '';
    chk.innerHTML = '';
    if(cb) cb.checked = false;
  }
  updateBulk();
}

function toggleAll() {
  allChecked = !allChecked;
  const chkAll = document.getElementById('chkAll');
  if (allChecked) {
    chkAll.style.background = 'var(--t1)';
    chkAll.style.borderColor = 'var(--t1)';
    chkAll.innerHTML = '<svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else {
    chkAll.style.background = '';
    chkAll.style.borderColor = '';
    chkAll.innerHTML = '';
  }

  const trs = document.querySelectorAll('#path-tbody tr');
  trs.forEach(tr => {
    const slug = tr.querySelector('.real-cb')?.value;
    if (slug) {
      if (allChecked && !tr.classList.contains('selected')) toggleRow(tr, slug);
      else if (!allChecked && tr.classList.contains('selected')) toggleRow(tr, slug);
    }
  });
}

function updateBulk() {
  const checked = document.querySelectorAll('.real-cb:checked');
  const bar = document.getElementById('bulkBar');
  const count = document.getElementById('bulkCount');
  if (checked.length > 0) {
    bar.classList.add('visible');
    count.textContent = checked.length + ' selected';
  } else {
    bar.classList.remove('visible');
  }
}

function doSearch(q) {
  const r = q ? ALL.filter(p =>
    p.url.toLowerCase().includes(q.toLowerCase()) ||
    p.label.toLowerCase().includes(q.toLowerCase())
  ) : ALL;
  renderRows(r);
}

function updateCount() {
  const lines = document.getElementById('cmd-input').value.split('\n').filter(l => l.trim().length > 0);
  document.getElementById('cmd-count').textContent = lines.length === 0 ? '0 paths' : lines.length + (lines.length === 1 ? ' path' : ' paths');
}

function doInject(btn) {
  const val = document.getElementById('cmd-input').value.trim();
  if (!val) {
    const area = document.getElementById('cmd-input');
    area.style.borderColor = '#DC2626';
    area.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.1)';
    area.focus();
    setTimeout(() => { area.style.borderColor = ''; area.style.boxShadow = ''; }, 1600);
    return false;
  }
  
  const spin = document.getElementById('inj-spin');
  const ico = document.getElementById('inj-ico');
  const txt = document.getElementById('inj-txt');

  btn.classList.add('loading');
  spin.style.display = 'flex';
  ico.style.display = 'none';
  txt.style.opacity = '0';
  
  // Actually submit form natively
  return true;
}

function confirmReset(e) {
  e.preventDefault();
  document.getElementById('reset-confirm').classList.add('show');
  document.getElementById('reset-btn').classList.add('confirming');
  document.getElementById('reset-txt').textContent = 'Confirm below...';
}

function cancelReset() {
  document.getElementById('reset-confirm').classList.remove('show');
  document.getElementById('reset-btn').classList.remove('confirming');
  document.getElementById('reset-txt').textContent = 'Factory Reset';
}

renderRows(ALL);
</script>
        <?php
    }
}

new FGM_FourTenGoneManager();

