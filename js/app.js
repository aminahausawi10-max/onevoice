/**
 * ONE VOICE - Core Application Logic
 * Integrates Web Audio DTMF dialpad, call simulator, wallet topup, and rate calculator
 */

document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let currentDialNumber = '';
    let callTimer = null;
    let callSeconds = 0;
    let isCallActive = false;
    let currentCallRate = 0.05; // $/min default
    let activeCallCountry = 'International';
    let userWalletBalance = 15.00;
    let selectedTopupAmount = 10;
    let cachedRates = [];

    // DOM Elements
    const dialDisplay = document.getElementById('dial-number');
    const dialCountry = document.getElementById('dial-country');
    const callingOverlay = document.getElementById('calling-overlay');
    const overlayName = document.getElementById('overlay-country-name');
    const overlayNumber = document.getElementById('overlay-phone-number');
    const overlayStatus = document.getElementById('overlay-call-status');
    const overlayTimer = document.getElementById('overlay-call-timer');
    const overlayRate = document.getElementById('overlay-call-rate');
    const callBtn = document.getElementById('btn-make-call');
    const endCallBtn = document.getElementById('btn-end-call');
    const backspaceBtn = document.getElementById('btn-dial-backspace');
    const dialClearBtn = document.getElementById('btn-dial-clear');
    
    const balanceDisplay = document.getElementById('wallet-balance');
    const navBalanceDisplay = document.getElementById('nav-balance');
    const ratesGrid = document.getElementById('rates-grid');
    const ratesSearch = document.getElementById('rates-search');
    const transactionsList = document.getElementById('transactions-body');
    const callLogsList = document.getElementById('call-logs-body');

    // Modals
    const topupModal = document.getElementById('topup-modal');
    const authModal = document.getElementById('auth-modal');

    // ----------------------------------------------------
    // 1. Dialpad & Audio Tone Handling
    // ----------------------------------------------------
    const dialKeys = document.querySelectorAll('.clay-dial-key');
    dialKeys.forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-digit');
            if (digit) {
                // Play DTMF tone
                if (window.soundEngine) {
                    window.soundEngine.playDtmf(digit);
                }
                currentDialNumber += digit;
                updateDialDisplay();
            }
        });
    });

    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', () => {
            currentDialNumber = currentDialNumber.slice(0, -1);
            updateDialDisplay();
        });
    }

    if (dialClearBtn) {
        dialClearBtn.addEventListener('click', () => {
            currentDialNumber = '';
            updateDialDisplay();
        });
    }

    // Auto-detect country from dial code
    function detectCountry(number) {
        if (!number) return { name: 'Enter Number', rate: 0.05, flag: '🌐' };

        const cleaned = number.replace(/\s+/g, '');
        if (cachedRates && cachedRates.length > 0) {
            // Find longest matching dial code
            const sortedRates = [...cachedRates].sort((a, b) => b.dial_code.length - a.dial_code.length);
            for (const r of sortedRates) {
                if (cleaned.startsWith(r.dial_code) || cleaned.startsWith(r.dial_code.replace('+', ''))) {
                    return { name: r.country_name, rate: r.rate, flag: r.flag };
                }
            }
        }

        if (cleaned.startsWith('+1') || cleaned.startsWith('1')) return { name: 'USA / Canada', rate: 0.012, flag: '🇺🇸' };
        if (cleaned.startsWith('+44') || cleaned.startsWith('44')) return { name: 'United Kingdom', rate: 0.018, flag: '🇬🇧' };
        if (cleaned.startsWith('+234') || cleaned.startsWith('234')) return { name: 'Nigeria', rate: 0.075, flag: '🇳🇬' };
        if (cleaned.startsWith('+91') || cleaned.startsWith('91')) return { name: 'India', rate: 0.019, flag: '🇮🇳' };
        if (cleaned.startsWith('+233') || cleaned.startsWith('233')) return { name: 'Ghana', rate: 0.12, flag: '🇬🇭' };
        if (cleaned.startsWith('+971')) return { name: 'UAE', rate: 0.14, flag: '🇦🇪' };
        
        return { name: 'International Call', rate: 0.05, flag: '🌐' };
    }

    function updateDialDisplay() {
        if (!dialDisplay) return;
        dialDisplay.textContent = currentDialNumber || '—';
        const detected = detectCountry(currentDialNumber);
        activeCallCountry = detected.name;
        currentCallRate = detected.rate;
        if (dialCountry) {
            dialCountry.innerHTML = `${detected.flag} ${detected.name} <span style="color:var(--clay-primary);font-weight:700;">($${detected.rate.toFixed(3)}/min)</span>`;
        }
    }

    // ----------------------------------------------------
    // 2. Call Simulation & Live Billing
    // ----------------------------------------------------
    if (callBtn) {
        callBtn.addEventListener('click', startCall);
    }

    if (endCallBtn) {
        endCallBtn.addEventListener('click', endCall);
    }

    function startCall() {
        if (!currentDialNumber || currentDialNumber.length < 3) {
            showToast('Please dial a valid phone number first', 'error');
            return;
        }

        if (userWalletBalance < 0.10) {
            showToast('Insufficient wallet credit! Please top up your wallet.', 'error');
            openTopupModal();
            return;
        }

        isCallActive = true;
        callSeconds = 0;
        const detected = detectCountry(currentDialNumber);
        activeCallCountry = detected.name;
        currentCallRate = detected.rate;

        // Setup Overlay
        overlayName.textContent = detected.name;
        overlayNumber.textContent = currentDialNumber;
        overlayStatus.textContent = 'Calling...';
        overlayTimer.textContent = '00:00';
        overlayRate.textContent = `Rate: $${detected.rate.toFixed(3)}/min`;
        callingOverlay.style.display = 'flex';

        // Play Ringback Sound
        if (window.soundEngine) {
            window.soundEngine.startRingback();
        }

        // Simulate remote answer after 2.5 seconds
        setTimeout(() => {
            if (!isCallActive) return;

            if (window.soundEngine) {
                window.soundEngine.stopRingback();
                window.soundEngine.playConnectBeep();
            }

            overlayStatus.textContent = 'Connected (HD Audio)';
            showToast('Call connected via low-latency carrier route', 'success');

            // Start timer
            callTimer = setInterval(() => {
                callSeconds++;
                const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
                const secs = String(callSeconds % 60).padStart(2, '0');
                overlayTimer.textContent = `${mins}:${secs}`;

                // Live deduction calculation
                const perSecondCost = currentCallRate / 60;
                userWalletBalance = Math.max(0, userWalletBalance - perSecondCost);
                updateBalanceUI(userWalletBalance);

                if (userWalletBalance <= 0) {
                    showToast('Call ended: credit depleted', 'warning');
                    endCall();
                }
            }, 1000);
        }, 2500);
    }

    function endCall() {
        if (!isCallActive) return;
        isCallActive = false;

        if (window.soundEngine) {
            window.soundEngine.stopRingback();
            window.soundEngine.playEndCallTone();
        }

        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
        }

        callingOverlay.style.display = 'none';

        const finalDuration = callSeconds;
        const finalCost = (finalDuration / 60) * currentCallRate;

        showToast(`Call ended. Duration: ${finalDuration}s • Cost: $${finalCost.toFixed(3)}`, 'info');

        // Post CDR to backend
        logCallToBackend(currentDialNumber, activeCallCountry, finalDuration, currentCallRate);
    }

    async function logCallToBackend(number, country, duration, rate) {
        try {
            const res = await fetch('api/calls.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination_number: number,
                    destination_country: country,
                    duration_seconds: duration,
                    rate_per_minute: rate
                })
            });
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.new_balance);
                updateBalanceUI(userWalletBalance);
                loadCallLogs();
                loadTransactions();
            }
        } catch (err) {
            console.warn('API call logging fallback:', err);
        }
    }

    // ----------------------------------------------------
    // 3. International Rates Calculator
    // ----------------------------------------------------
    async function loadRates(searchQuery = '') {
        try {
            const url = searchQuery ? `api/rates.php?search=${encodeURIComponent(searchQuery)}` : 'api/rates.php';
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.success && data.rates) {
                cachedRates = data.rates;
                renderRates(data.rates);
            }
        } catch (err) {
            console.warn('Using cached fallback rates:', err);
        }
    }

    function renderRates(rates) {
        if (!ratesGrid) return;
        ratesGrid.innerHTML = '';

        if (rates.length === 0) {
            ratesGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>No destinations found</h3>
                    <p>Try searching for country name or dial code (e.g. "+1", "United Kingdom", "Nigeria")</p>
                </div>
            `;
            return;
        }

        rates.forEach(r => {
            const card = document.createElement('div');
            card.className = 'clay-card rate-card';
            const savingsPercent = Math.round(((r.roaming - r.rate) / r.roaming) * 100);

            card.innerHTML = `
                <div class="rate-card-top">
                    <div class="rate-country-info">
                        <span class="country-flag">${r.flag}</span>
                        <div>
                            <div class="country-name">${r.country_name}</div>
                            <span class="country-code">${r.dial_code}</span>
                        </div>
                    </div>
                    ${r.popular ? '<span class="clay-badge badge-mint">Popular</span>' : ''}
                </div>
                <div class="rate-price-row">
                    <div>
                        <span class="rate-price-big">$${parseFloat(r.rate).toFixed(3)}</span>
                        <span class="rate-price-unit">/min</span>
                    </div>
                    <span class="roaming-savings">Save ${savingsPercent}%</span>
                </div>
                <button class="clay-btn clay-btn-primary" style="padding: 10px 18px; font-size: 0.9rem;" data-dial="${r.dial_code}" data-country="${r.country_name}">
                    📞 Dial Now
                </button>
            `;

            const dialBtn = card.querySelector('button');
            dialBtn.addEventListener('click', () => {
                currentDialNumber = r.dial_code;
                updateDialDisplay();
                document.getElementById('dialer-section').scrollIntoView({ behavior: 'smooth' });
                showToast(`Dial code for ${r.country_name} (${r.dial_code}) loaded into dialer`, 'info');
            });

            ratesGrid.appendChild(card);
        });
    }

    if (ratesSearch) {
        let debounceTimer;
        ratesSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadRates(e.target.value.trim());
            }, 250);
        });
    }

    // ----------------------------------------------------
    // 4. Wallet & Top-up Handling
    // ----------------------------------------------------
    async function loadWalletData() {
        try {
            const res = await fetch('api/wallet.php');
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.balance);
                updateBalanceUI(userWalletBalance);
                if (data.transactions) {
                    renderTransactions(data.transactions);
                }
            }
        } catch (err) {
            console.warn('Wallet API fallback:', err);
        }
    }

    function updateBalanceUI(balance) {
        const formatted = `$${balance.toFixed(2)}`;
        if (balanceDisplay) balanceDisplay.textContent = formatted;
        if (navBalanceDisplay) navBalanceDisplay.textContent = formatted;
    }

    // Top-up chip selection
    const topupChips = document.querySelectorAll('.topup-chip-btn');
    topupChips.forEach(chip => {
        chip.addEventListener('click', () => {
            topupChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedTopupAmount = parseFloat(chip.getAttribute('data-amount'));
            const customInput = document.getElementById('custom-topup-input');
            if (customInput) customInput.value = selectedTopupAmount;
        });
    });

    const customInput = document.getElementById('custom-topup-input');
    if (customInput) {
        customInput.addEventListener('input', (e) => {
            selectedTopupAmount = parseFloat(e.target.value) || 0;
            topupChips.forEach(c => c.classList.remove('active'));
        });
    }

    const confirmTopupBtn = document.getElementById('btn-confirm-topup');
    if (confirmTopupBtn) {
        confirmTopupBtn.addEventListener('click', processTopup);
    }

    async function processTopup() {
        if (!selectedTopupAmount || selectedTopupAmount <= 0) {
            showToast('Please select or enter a valid amount', 'error');
            return;
        }

        confirmTopupBtn.textContent = 'Processing Payment...';
        confirmTopupBtn.disabled = true;

        try {
            const res = await fetch('api/wallet.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'topup', amount: selectedTopupAmount })
            });
            const data = await res.json();

            if (data.success) {
                userWalletBalance = parseFloat(data.balance);
                updateBalanceUI(userWalletBalance);
                showToast(`🎉 Top-up successful! $${selectedTopupAmount.toFixed(2)} added.`, 'success');
                closeTopupModal();
                loadTransactions();
            } else {
                showToast(data.message || 'Payment failed', 'error');
            }
        } catch (err) {
            // Local fallback simulation
            userWalletBalance += selectedTopupAmount;
            updateBalanceUI(userWalletBalance);
            showToast(`🎉 $${selectedTopupAmount.toFixed(2)} added to wallet!`, 'success');
            closeTopupModal();
        } finally {
            confirmTopupBtn.textContent = 'Confirm & Top Up';
            confirmTopupBtn.disabled = false;
        }
    }

    function renderTransactions(txs) {
        if (!transactionsList) return;
        transactionsList.innerHTML = '';

        if (!txs || txs.length === 0) {
            transactionsList.innerHTML = `<tr><td colspan="4" style="text-align:center;">No recent transactions</td></tr>`;
            return;
        }

        txs.forEach(t => {
            const tr = document.createElement('tr');
            const isPlus = parseFloat(t.amount) > 0;
            const amountColor = isPlus ? 'var(--clay-mint-dark)' : 'var(--clay-coral-dark)';
            const sign = isPlus ? '+' : '';
            
            tr.innerHTML = `
                <td><strong>${t.description}</strong></td>
                <td><span class="clay-badge">${t.type}</span></td>
                <td style="color:${amountColor}; font-weight:800; font-family:var(--font-mono);">${sign}$${Math.abs(parseFloat(t.amount)).toFixed(2)}</td>
                <td style="color:var(--text-muted); font-size:0.85rem;">${t.created_at || 'Just now'}</td>
            `;
            transactionsList.appendChild(tr);
        });
    }

    async function loadTransactions() {
        try {
            const res = await fetch('api/wallet.php');
            const data = await res.json();
            if (data.success && data.transactions) {
                renderTransactions(data.transactions);
            }
        } catch (err) {}
    }

    async function loadCallLogs() {
        try {
            const res = await fetch('api/calls.php');
            const data = await res.json();
            if (data.success && data.calls) {
                renderCallLogs(data.calls);
            }
        } catch (err) {}
    }

    function renderCallLogs(calls) {
        if (!callLogsList) return;
        callLogsList.innerHTML = '';

        if (!calls || calls.length === 0) {
            callLogsList.innerHTML = `<tr><td colspan="5" style="text-align:center;">No call logs recorded</td></tr>`;
            return;
        }

        calls.forEach(c => {
            const tr = document.createElement('tr');
            const mins = Math.floor(c.duration_seconds / 60);
            const secs = c.duration_seconds % 60;
            const formattedDuration = `${mins}m ${secs}s`;

            tr.innerHTML = `
                <td><strong>${c.destination_country}</strong></td>
                <td style="font-family:var(--font-mono);">${c.destination_number}</td>
                <td>${formattedDuration}</td>
                <td style="color:var(--clay-coral-dark); font-weight:700; font-family:var(--font-mono);">-$${parseFloat(c.cost).toFixed(3)}</td>
                <td><span class="clay-badge badge-mint">${c.status || 'completed'}</span></td>
            `;
            callLogsList.appendChild(tr);
        });
    }

    // ----------------------------------------------------
    // 5. Modal Controllers
    // ----------------------------------------------------
    window.openTopupModal = () => {
        if (topupModal) topupModal.classList.add('active');
    };

    window.closeTopupModal = () => {
        if (topupModal) topupModal.classList.remove('active');
    };

    window.openAuthModal = () => {
        if (authModal) authModal.classList.add('active');
    };

    window.closeAuthModal = () => {
        if (authModal) authModal.classList.remove('active');
    };

    const triggerTopupBtns = document.querySelectorAll('.trigger-topup');
    triggerTopupBtns.forEach(btn => btn.addEventListener('click', window.openTopupModal));

    const triggerAuthBtns = document.querySelectorAll('.trigger-auth');
    triggerAuthBtns.forEach(btn => btn.addEventListener('click', window.openAuthModal));

    // Handle Auth form submit
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneInput = document.getElementById('auth-phone').value;
            const nameInput = document.getElementById('auth-name').value;

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneInput, name: nameInput })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Welcome ${data.user.name}! Authenticated.`, 'success');
                    const userNameEl = document.getElementById('user-profile-name');
                    if (userNameEl) userNameEl.textContent = data.user.name;
                    closeAuthModal();
                }
            } catch (err) {
                showToast('Signed in successfully (demo session)', 'success');
                closeAuthModal();
            }
        });
    }

    // ----------------------------------------------------
    // 6. Toast Notification Helper
    // ----------------------------------------------------
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'clay-toast';
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Initial Data Fetch
    loadRates();
    loadWalletData();
    loadCallLogs();
    updateDialDisplay();
});
