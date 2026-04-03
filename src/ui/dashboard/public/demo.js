/**
 * Universal Trading Bot - Demo Mode Controller
 * Handles demo/live mode switching and demo account management
 */

class DemoModeController {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.mode = 'demo'; // 'demo' or 'live'
        this.demoBalance = 10000;
        this.initialized = false;
        
        console.log('🎮 Demo Mode Controller initialized');
    }
    
    /**
     * Initialize demo mode
     */
    async initialize() {
        try {
            console.log('🚀 Initializing demo mode...');
            
            // Load current mode info
            await this.loadModeInfo();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update UI
            this.updateUI();
            
            this.initialized = true;
            console.log('✅ Demo mode ready');
            
        } catch (error) {
            console.error('❌ Failed to initialize demo mode:', error);
        }
    }
    
    /**
     * Load mode information from server
     */
    async loadModeInfo() {
        try {
            const response = await fetch('/api/demo/info');
            const data = await response.json();
            
            if (data.success) {
                this.mode = data.modeInfo.currentMode;
                console.log(`📊 Current mode: ${this.mode}`);
                return data.modeInfo;
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load mode info, using default demo mode');
            this.mode = 'demo';
        }
        
        return null;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Reset demo button
        const resetBtn = document.getElementById('resetDemo');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetDemoAccount());
        }
        
        // Switch mode button
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => this.showModeSwitchConfirmation());
        }
        
        // Mode confirmation buttons
        const confirmSwitchBtn = document.getElementById('confirmSwitch');
        const cancelSwitchBtn = document.getElementById('cancelSwitch');
        
        if (confirmSwitchBtn) {
            confirmSwitchBtn.addEventListener('click', () => this.switchMode());
        }
        
        if (cancelSwitchBtn) {
            cancelSwitchBtn.addEventListener('click', () => this.hideModeSwitchConfirmation());
        }
    }
    
    /**
     * Update UI based on current mode
     */
    updateUI() {
        const demoControls = document.getElementById('demoControls');
        const demoBadge = document.getElementById('demoBadge');
        const switchBtn = document.getElementById('switchMode');
        
        if (!demoControls || !demoBadge || !switchBtn) return;
        
        if (this.mode === 'demo') {
            // Show demo controls
            demoControls.style.display = 'flex';
            
            // Update badge
            demoBadge.innerHTML = '<i class="fas fa-flask"></i><span>DEMO MODE</span>';
            
            // Update switch button
            switchBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Live';
            switchBtn.title = 'Switch to live trading mode';
            
            // Add demo indicator to portfolio
            this.addDemoIndicators();
            
        } else {
            // Show live mode badge
            demoControls.style.display = 'flex';
            demoBadge.innerHTML = '<i class="fas fa-bolt"></i><span>LIVE MODE</span>';
            demoBadge.className = 'live-badge';
            
            // Update switch button
            switchBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Demo';
            switchBtn.title = 'Switch to demo mode';
            
            // Remove demo indicators
            this.removeDemoIndicators();
        }
    }
    
    /**
     * Add demo indicators to UI
     */
    addDemoIndicators() {
        // Add demo indicator to portfolio card
        const portfolioCard = document.querySelector('.portfolio-card');
        if (portfolioCard && !portfolioCard.querySelector('.demo-indicator')) {
            const demoIndicator = document.createElement('div');
            demoIndicator.className = 'demo-indicator';
            demoIndicator.innerHTML = '<i class="fas fa-flask"></i> DEMO';
            portfolioCard.style.position = 'relative';
            portfolioCard.appendChild(demoIndicator);
        }
        
        // Update balance display to show demo balance
        this.updateBalanceDisplay();
    }
    
    /**
     * Remove demo indicators from UI
     */
    removeDemoIndicators() {
        // Remove demo indicator from portfolio
        const demoIndicator = document.querySelector('.demo-indicator');
        if (demoIndicator) {
            demoIndicator.remove();
        }
    }
    
    /**
     * Update balance display for demo mode
     */
    updateBalanceDisplay() {
        // This would be called when balance data is received
        // For now, we'll just add a visual cue
        const balanceElements = document.querySelectorAll('.balance-amount');
        balanceElements.forEach(el => {
            if (!el.classList.contains('demo-balance-highlight')) {
                el.classList.add('demo-balance-highlight');
                el.style.color = '#667eea';
            }
        });
    }
    
    /**
     * Reset demo account
     */
    async resetDemoAccount() {
        try {
            if (this.mode !== 'demo') {
                this.showNotification('Reset is only available in demo mode', 'warning');
                return;
            }
            
            const confirmed = confirm('Are you sure you want to reset your demo account? This will reset your balance to $10,000 and clear all trades.');
            
            if (!confirmed) return;
            
            const response = await fetch('/api/demo/reset', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Demo account reset successfully!', 'success');
                
                // Reload dashboard data
                if (this.dashboard && this.dashboard.loadDashboardData) {
                    this.dashboard.loadDashboardData();
                }
                
            } else {
                this.showNotification(`Reset failed: ${data.message}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Reset demo account failed:', error);
            this.showNotification('Failed to reset demo account', 'error');
        }
    }
    
    /**
     * Show mode switch confirmation
     */
    showModeSwitchConfirmation() {
        const targetMode = this.mode === 'demo' ? 'live' : 'demo';
        const confirmation = document.getElementById('modeConfirmation');
        const message = document.getElementById('modeConfirmationMessage');
        
        if (!confirmation || !message) {
            // Create confirmation modal if it doesn't exist
            this.createModeConfirmationModal();
            return;
        }
        
        const warning = targetMode === 'live' 
            ? '⚠️ WARNING: Live trading uses real money. Make sure you understand the risks.'
            : 'Switching to demo mode will reset your demo account.';
        
        message.textContent = `Are you sure you want to switch to ${targetMode.toUpperCase()} mode? ${warning}`;
        
        confirmation.classList.add('active');
    }
    
    /**
     * Hide mode switch confirmation
     */
    hideModeSwitchConfirmation() {
        const confirmation = document.getElementById('modeConfirmation');
        if (confirmation) {
            confirmation.classList.remove('active');
        }
    }
    
    /**
     * Create mode confirmation modal
     */
    createModeConfirmationModal() {
        const modalHTML = `
            <div class="mode-confirmation" id="modeConfirmation">
                <div class="mode-confirmation-content">
                    <h3>Switch Trading Mode</h3>
                    <p id="modeConfirmationMessage"></p>
                    <div class="mode-confirmation-buttons">
                        <button class="btn btn-danger" id="confirmSwitch">Switch</button>
                        <button class="btn btn-secondary" id="cancelSwitch">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Re-attach event listeners
        this.setupEventListeners();
        
        // Show the modal
        this.showModeSwitchConfirmation();
    }
    
    /**
     * Switch between demo and live modes
     */
    async switchMode() {
        try {
            const targetMode = this.mode === 'demo' ? 'live' : 'demo';
            
            console.log(`🔄 Switching to ${targetMode} mode...`);
            
            const response = await fetch('/api/demo/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mode: targetMode })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mode = targetMode;
                this.showNotification(`Switched to ${targetMode.toUpperCase()} mode`, 'success');
                this.updateUI();
                
                // Reload dashboard data
                if (this.dashboard && this.dashboard.loadDashboardData) {
                    this.dashboard.loadDashboardData();
                }
                
            } else {
                this.showNotification(`Switch failed: ${data.message}`, 'error');
            }
            
            this.hideModeSwitchConfirmation();
            
        } catch (error) {
            console.error('❌ Mode switch failed:', error);
            this.showNotification('Failed to switch mode', 'error');
            this.hideModeSwitchConfirmation();
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use dashboard's notification system if available
        if (this.dashboard && this.dashboard.showNotification) {
            this.dashboard.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Get current mode
     */
    getCurrentMode() {
        return this.mode;
    }
    
    /**
     * Check if in demo mode
     */
    isDemoMode() {
        return this.mode === 'demo';
    }
    
    /**
     * Check if in live mode
     */
    isLiveMode() {
        return this.mode === 'live';
    }
    
    /**
     * Get demo balance
     */
    getDemoBalance() {
        return this.demoBalance;
    }
    
    /**
     * Update demo balance
     */
    updateDemoBalance(newBalance) {
        this.demoBalance = newBalance;
    }
}

// Initialize demo mode when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dashboard app to be initialized
    setTimeout(() => {
        if (window.dashboardApp) {
            window.demoController = new DemoModeController(window.dashboardApp);
            window.demoController.initialize();
        }
    }, 1000);
});