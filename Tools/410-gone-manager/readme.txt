=== 410 Gone Manager ===
Contributors: ankitjaiswal
Tags: 410, gone, seo, deleted content, crawl budget
Requires at least: 5.8
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.3.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Manage removed URLs with automatic 410 Gone responses, activity logs, bulk tools, CSV import/export, and SEO-safe cleanup.

== Description ==

410 Gone Manager helps site owners return the correct HTTP 410 Gone response for content that has been permanently removed.

It automatically catches deleted posts and terms, lets administrators add manual 410 rules, supports wildcard paths, records recent activity, includes CSV import/export tools, discovers public 404 URLs for careful review before converting them to 410 rules, includes a master protection toggle for bypass mode, and explains safe 410 strategy inside the dashboard.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/410-gone-manager/` directory, or install the plugin zip through the WordPress Plugins screen.
2. Activate the plugin through the Plugins screen in WordPress.
3. Go to Tools > 410 Gone Manager to manage removed URLs.

== Frequently Asked Questions ==

= What does a 410 response do? =

A 410 Gone response tells browsers and crawlers that a URL has been permanently removed and is not expected to return.

= Will existing pre-launch rules be preserved? =

Yes. Version 1.0.0 migrates the earlier `u410_*` option data into the new `fgm_*` option keys the first time it runs.

== Changelog ==

= 1.3.1 =

* Added premium first-run skeleton state for the empty Activity Trail.

= 1.3.0 =

* Added premium 410 Strategy Guide with Google/Bing context, decision rules, and plugin workflow.
* Added first-run guide spotlight with persistent minimize behavior.
* Added official reference links for HTTP status and search engine cleanup guidance.

= 1.2.0 =

* Added Protection Engine toggle in the premium top bar.
* Paused mode bypasses public 410 responses, 404 discovery, and automatic deleted-content capture.
* Added paused-state dashboard copy so saved rules stay visible but are clearly not enforced.

= 1.1.0 =

* Added 404 Discovery with review-first conversion into 410 rules.
* Added candidate ignore flow for URLs that should not become 410 responses.
* Added filtering for admin, sitemap, API, and asset 404 noise.

= 1.0.0 =

* Initial launch release as 410 Gone Manager.
* Added admin-bar-aware sticky layout.
* Added clean reset-button icon.
* Added legacy option migration from pre-launch builds.
* Added CSV import/export, manual rule management, activity log, and automatic deleted-content capture.
