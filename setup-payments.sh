#!/bin/bash
# Quick Setup Script - Zahlungssystem aktivieren

echo "🔐 Zahlungssystem-Setup für Wechselmodell"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nicht installiert. Bitte installiere Node.js 18+"
    exit 1
fi

echo "✅ Node.js gefunden: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm nicht installiert"
    exit 1
fi

echo "✅ npm gefunden: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installiere Stripe Packages..."
npm install @stripe/stripe-react-native stripe

if [ $? -ne 0 ]; then
    echo "❌ Installation fehlgeschlagen"
    exit 1
fi

echo "✅ Stripe Packages installiert!"
echo ""

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local existiert nicht. Erstelle Template..."
    cp .env.local.template .env.local 2>/dev/null || cat > .env.local << 'EOF'
# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# App Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF
    
    echo "✅ .env.local erstellt. Bitte fülle folgende Werte ein:"
    echo "   - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "   - STRIPE_SECRET_KEY"
    echo ""
else
    echo "✅ .env.local gefunden"
fi

echo ""
echo "📋 Nächste Schritte:"
echo "1. Gehe zu: https://dashboard.stripe.com"
echo "2. Kopiere deine Publishable & Secret Keys"
echo "3. Ersetze die Werte in .env.local"
echo "4. Starte die App: npm run web"
echo ""
echo "✅ Setup abgeschlossen!"
