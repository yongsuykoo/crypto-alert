// Crypto Alert - BTC/ETH Price Tracker
// Made with ❤️ for Yongskie

let btcChart, ethChart;
let alerts = JSON.parse(localStorage.getItem('cryptoAlerts') || '[]');
let priceHistory = { btc: [], eth: [] };

// Initialize charts
function initCharts() {
    const chartConfig = (color) => ({
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            interaction: { intersect: false }
        }
    });

    btcChart = new Chart(document.getElementById('btc-chart'), chartConfig('#f7931a'));
    ethChart = new Chart(document.getElementById('eth-chart'), chartConfig('#627eea'));
}

// Format currency
function formatCurrency(num) {
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fetch prices from CoinGecko
async function fetchPrices() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=24h'
        );
        const data = await response.json();
        
        const btc = data.find(c => c.id === 'bitcoin');
        const eth = data.find(c => c.id === 'ethereum');

        if (btc) updateCoinDisplay('btc', btc);
        if (eth) updateCoinDisplay('eth', eth);

        // Update charts
        updateChart(btcChart, priceHistory.btc, btc?.current_price);
        updateChart(ethChart, priceHistory.eth, eth?.current_price);

        // Check alerts
        checkAlerts(btc?.current_price, eth?.current_price);

        // Update timestamp
        document.getElementById('last-updated').textContent = new Date().toLocaleString('en-PH');

    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

// Update coin display
function updateCoinDisplay(coin, data) {
    const price = data.current_price;
    const change = data.price_change_percentage_24h;
    const volume = data.total_volume;
    const mcap = data.market_cap;

    document.getElementById(`${coin}-price`).textContent = formatCurrency(price);
    
    const changeEl = document.getElementById(`${coin}-change`);
    const isPositive = change >= 0;
    changeEl.textContent = (isPositive ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = `px-3 py-1 rounded-full text-sm font-medium ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;

    document.getElementById(`${coin}-volume`).textContent = formatCurrency(volume);
    document.getElementById(`${coin}-mcap`).textContent = formatCurrency(mcap);

    if (coin === 'btc') {
        document.getElementById('btc-high').textContent = formatCurrency(data.high_24h);
        document.getElementById('btc-low').textContent = formatCurrency(data.low_24h);
    }
}

// Update chart data
function updateChart(chart, history, price) {
    if (!price) return;
    
    const now = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    history.push(price);
    
    if (history.length > 20) history.shift();
    
    chart.data.labels = history.map((_, i) => i);
    chart.data.datasets[0].data = history;
    chart.update('none');
}

// Set price alert
function setAlert() {
    const coin = document.getElementById('alert-coin').value;
    const condition = document.getElementById('alert-condition').value;
    const price = parseFloat(document.getElementById('alert-price').value);

    if (!price || price <= 0) {
        showNotification('⚠️ Please enter a valid price!');
        return;
    }

    const alert = {
        id: Date.now(),
        coin,
        condition,
        price,
        triggered: false
    };

    alerts.push(alert);
    localStorage.setItem('cryptoAlerts', JSON.stringify(alerts));
    renderAlerts();
    document.getElementById('alert-price').value = '';
    showNotification(`✅ Alert set for ${coin.toUpperCase()} ${condition} $${price.toLocaleString()}`);
}

// Check alerts against current prices
function checkAlerts(btcPrice, ethPrice) {
    alerts.forEach(alert => {
        if (alert.triggered) return;

        const currentPrice = alert.coin === 'bitcoin' ? btcPrice : ethPrice;
        if (!currentPrice) return;

        const triggered = alert.condition === 'above' 
            ? currentPrice >= alert.price 
            : currentPrice <= alert.price;

        if (triggered) {
            alert.triggered = true;
            localStorage.setItem('cryptoAlerts', JSON.stringify(alerts));
            showNotification(`🚨 ${alert.coin.toUpperCase()} is now ${alert.condition} $${alert.price.toLocaleString()}! Current: $${currentPrice.toLocaleString()}`);
            
            // Browser notification
            if (Notification.permission === 'granted') {
                new Notification('Crypto Alert!', {
                    body: `${alert.coin.toUpperCase()} is now ${alert.condition} $${alert.price.toLocaleString()}!`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968260.png'
                });
            }
            
            renderAlerts();
        }
    });
}

// Render active alerts
function renderAlerts() {
    const container = document.getElementById('alerts-container');
    const activeAlerts = alerts.filter(a => !a.triggered);

    if (activeAlerts.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No active alerts. Set one above!</p>';
        return;
    }

    container.innerHTML = activeAlerts.map(alert => `
        <div class="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3">
            <div class="flex items-center gap-3">
                <i class="fab fa-${alert.coin === 'bitcoin' ? 'bitcoin text-orange-500' : 'ethereum text-indigo-400'}"></i>
                <span>${alert.coin.toUpperCase()} ${alert.condition} <strong>$${alert.price.toLocaleString()}</strong></span>
            </div>
            <button onclick="removeAlert(${alert.id})" class="text-gray-400 hover:text-red-400 transition-colors">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Remove alert
function removeAlert(id) {
    alerts = alerts.filter(a => a.id !== id);
    localStorage.setItem('cryptoAlerts', JSON.stringify(alerts));
    renderAlerts();
    showNotification('🗑️ Alert removed');
}

// Show notification
function showNotification(message) {
    const el = document.getElementById('notification');
    document.getElementById('notification-text').textContent = message;
    el.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        el.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    renderAlerts();
    fetchPrices();
    requestNotificationPermission();
    
    // Auto-refresh every 30 seconds
    setInterval(fetchPrices, 30000);
});

console.log('🚀 Crypto Alert loaded! Made for Yongskie 🇵🇭');