<?php
if (!defined('ABSPATH')) exit;

$settings = get_option('strikebot_settings');
$theme = $settings['theme'] ?? array();
$widget = $settings['widget'] ?? array();
$name = $settings['name'] ?? 'Chatbot';
$addOns = $settings['addOns'] ?? array();

$position = $widget['position'] ?? 'bottom-right';
$mode = $theme['mode'] ?? 'light';
$primaryColor = $theme['primaryColor'] ?? '#3B82F6';
$secondaryColor = $theme['secondaryColor'] ?? '#1E40AF';
$backgroundColor = $mode === 'dark' ? '#1F2937' : '#FFFFFF';
$textColor = $mode === 'dark' ? '#F9FAFB' : '#1F2937';
$iconUrl = $widget['iconUrl'] ?? '';
$welcomeMessage = $widget['welcomeMessage'] ?? 'Hello! How can I help you today?';
$placeholder = $widget['placeholder'] ?? 'Type your message...';

// Check if branding removal is enabled (either via add-on or setting)
$removeBranding = false;
if (is_array($addOns)) {
    foreach ($addOns as $addOn) {
        if (is_array($addOn) && isset($addOn['type']) && $addOn['type'] === 'remove_branding') {
            $removeBranding = true;
            break;
        }
    }
}
// Also check the removeBranding setting (can be toggled in dashboard if add-on is active)
if ($removeBranding && isset($settings['removeBranding'])) {
    $removeBranding = (bool) $settings['removeBranding'];
}
?>

<div id="strikebot-widget"
     class="strikebot-widget strikebot-<?php echo esc_attr($position); ?> strikebot-<?php echo esc_attr($mode); ?>"
     data-position="<?php echo esc_attr($position); ?>"
     style="--sb-primary: <?php echo esc_attr($primaryColor); ?>;
            --sb-secondary: <?php echo esc_attr($secondaryColor); ?>;
            --sb-bg: <?php echo esc_attr($backgroundColor); ?>;
            --sb-text: <?php echo esc_attr($textColor); ?>;">

    <!-- Chat Window -->
    <div id="strikebot-chat" class="strikebot-chat hidden">
        <!-- Header -->
        <div class="strikebot-chat-header">
            <div class="strikebot-chat-avatar">
                <?php if ($iconUrl): ?>
                    <img src="<?php echo esc_url($iconUrl); ?>" alt="<?php echo esc_attr($name); ?>">
                <?php else: ?>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                <?php endif; ?>
            </div>
            <div class="strikebot-chat-info">
                <span class="strikebot-chat-name"><?php echo esc_html($name); ?></span>
                <span class="strikebot-chat-status">Online</span>
            </div>
            <button class="strikebot-hamburger-menu" id="strikebot-hamburger-menu" aria-label="Open menu" data-testid="hamburger-menu">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
            </button>
            <button class="strikebot-chat-close" aria-label="Close chat">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>

        <!-- Sidebar Overlay -->
        <div class="strikebot-sidebar-overlay" id="strikebot-sidebar-overlay" data-testid="sidebar-overlay"></div>

        <!-- Sidebar -->
        <div class="strikebot-sidebar" id="strikebot-sidebar" data-testid="sidebar">
            <!-- Back Button -->
            <button class="strikebot-sidebar-back" id="strikebot-sidebar-back" aria-label="Close menu" data-testid="sidebar-back">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
            </button>

            <!-- New Chat Button -->
            <button class="strikebot-sidebar-new-chat" id="strikebot-sidebar-new-chat" data-testid="new-chat-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
                New Chat
            </button>

            <!-- Chat History Section -->
            <div class="strikebot-sidebar-section">
                <h3 class="strikebot-sidebar-section-title">Chat History</h3>
                <div class="strikebot-chat-history-list" id="strikebot-chat-history-list" data-testid="chat-history-list">
                    <!-- Dynamically populated chat list -->
                </div>
            </div>

            <!-- Settings Section -->
            <div class="strikebot-sidebar-section">
                <h3 class="strikebot-sidebar-section-title">Settings</h3>

                <!-- Font Size Selector -->
                <div class="strikebot-settings-group">
                    <label class="strikebot-settings-label">Font Size</label>
                    <div class="strikebot-font-size-buttons" data-testid="font-size-buttons">
                        <button class="strikebot-font-size-btn" data-size="small" aria-label="Small font" data-testid="font-size-small">S</button>
                        <button class="strikebot-font-size-btn" data-size="medium" aria-label="Medium font" data-testid="font-size-medium">M</button>
                        <button class="strikebot-font-size-btn" data-size="large" aria-label="Large font" data-testid="font-size-large">L</button>
                        <button class="strikebot-font-size-btn" data-size="x-large" aria-label="Extra large font" data-testid="font-size-xl">XL</button>
                    </div>
                </div>

                <!-- Sound Notifications Toggle -->
                <div class="strikebot-settings-group">
                    <label class="strikebot-settings-label" for="strikebot-sound-toggle">Sound Notifications</label>
                    <div class="strikebot-toggle-switch">
                        <input type="checkbox" id="strikebot-sound-toggle" class="strikebot-toggle-input" data-testid="sound-toggle" checked>
                        <label for="strikebot-sound-toggle" class="strikebot-toggle-slider"></label>
                    </div>
                </div>

                <!-- Show Timestamps Toggle -->
                <div class="strikebot-settings-group">
                    <label class="strikebot-settings-label" for="strikebot-timestamps-toggle">Show Timestamps</label>
                    <div class="strikebot-toggle-switch">
                        <input type="checkbox" id="strikebot-timestamps-toggle" class="strikebot-toggle-input" data-testid="timestamps-toggle">
                        <label for="strikebot-timestamps-toggle" class="strikebot-toggle-slider"></label>
                    </div>
                </div>
            </div>

            <!-- Clear All Chats Button -->
            <button class="strikebot-clear-all-btn" id="strikebot-clear-all-chats" data-testid="clear-all-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"/>
                </svg>
                <span class="strikebot-clear-all-text">Clear All Chats</span>
                <div class="strikebot-clear-progress-bar" id="strikebot-clear-progress-bar" data-testid="clear-progress-bar"></div>
            </button>
        </div>

        <!-- Messages -->
        <div class="strikebot-chat-messages" id="strikebot-messages">
            <div class="strikebot-message strikebot-message-bot">
                <div class="strikebot-message-avatar">
                    <?php if ($iconUrl): ?>
                        <img src="<?php echo esc_url($iconUrl); ?>" alt="">
                    <?php else: ?>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                    <?php endif; ?>
                </div>
                <div class="strikebot-message-content">
                    <?php echo esc_html($welcomeMessage); ?>
                </div>
            </div>
        </div>

        <!-- Scroll to Bottom Button -->
        <button class="strikebot-scroll-to-bottom" id="strikebot-scroll-to-bottom" aria-label="Scroll to bottom" data-testid="scroll-to-bottom" hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.62 5.38L17.38 6.14L12 11.52L6.62 6.14L7.38 5.38L12 9.88L16.62 5.38M16.62 11.38L17.38 12.14L12 17.52L6.62 12.14L7.38 11.38L12 15.88L16.62 11.38Z"/>
            </svg>
        </button>

        <!-- Input -->
        <div class="strikebot-chat-input">
            <input type="text"
                   id="strikebot-input"
                   placeholder="<?php echo esc_attr($placeholder); ?>"
                   autocomplete="off"
                   style="<?php echo $mode === 'dark' ? 'color: #ffffff !important;' : ''; ?>">
            <button id="strikebot-export-chat" class="strikebot-export-chat" aria-label="Export chat" data-testid="export-chat">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                </svg>
            </button>
            <button id="strikebot-send" aria-label="Send message">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            </button>
        </div>

        <!-- Powered By -->
        <?php if (!$removeBranding): ?>
        <div class="strikebot-powered-by">
            Powered by Strikebot
        </div>
        <?php endif; ?>
    </div>

    <!-- Toggle Button -->
    <button id="strikebot-toggle" class="strikebot-toggle" aria-label="Open chat">
        <span class="strikebot-toggle-icon strikebot-toggle-open">
            <?php if ($iconUrl): ?>
                <img src="<?php echo esc_url($iconUrl); ?>" alt="">
            <?php else: ?>
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
            <?php endif; ?>
        </span>
        <span class="strikebot-toggle-icon strikebot-toggle-close hidden">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </span>
    </button>
</div>
