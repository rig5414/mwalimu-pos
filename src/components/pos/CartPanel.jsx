import { useCartStore } from '../../store/cartStore'
import { posTheme } from '../../styles/posTheme'

export default function CartPanel({ onCheckout }) {
  const { items, customerName, setCustomerName, updateQty, clear } = useCartStore()

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <h2 style={s.title}>Transaction</h2>
          {itemCount > 0 && <span style={s.badge}>{itemCount}</span>}
        </div>
        {items.length > 0 && (
          <button type="button" onClick={clear} style={s.clearBtn}>
            Clear
          </button>
        )}
      </div>

      <div style={s.customerWrap}>
        <input
          style={s.customerInput}
          className="cart-customer-input"
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div style={s.itemsScroll} className="pos-dark-scroll">
        {items.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: '2.8rem', marginBottom: '0.6rem' }}>🛒</span>
            <p style={{ fontSize: '0.85rem', color: posTheme.textMuted, textAlign: 'center' }}>
              Cart is empty.
              <br />
              Tap a product to add.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item) => (
              <CartItem key={item.key} item={item} onUpdateQty={updateQty} />
            ))}
          </div>
        )}
      </div>

      <div style={s.totals}>
        <div style={s.totalRow}>
          <span style={s.totalLabel}>Subtotal</span>
          <span style={s.totalValue}>KES {subtotal.toLocaleString()}</span>
        </div>
        <div style={s.totalRow}>
          <span style={s.totalLabel}>Tax (0%)</span>
          <span style={s.totalValue}>KES 0</span>
        </div>
        <div style={s.divider} />
        <div style={s.totalRow}>
          <span style={{ ...s.totalLabel, color: posTheme.text, fontWeight: 700, fontSize: '0.95rem' }}>
            Total
          </span>
          <span style={s.grandTotal}>KES {subtotal.toLocaleString()}</span>
        </div>
      </div>

      <div style={s.checkoutWrap}>
        <button
          type="button"
          onClick={onCheckout}
          disabled={items.length === 0}
          className="cart-checkout-btn"
          style={{
            ...s.checkoutBtn,
            ...(items.length === 0 ? s.checkoutDisabled : s.checkoutEnabled),
          }}
        >
          <span>Checkout</span>
          {items.length > 0 && <span style={s.checkoutAmt}>KES {subtotal.toLocaleString()}</span>}
        </button>
      </div>

      <style>{`
        .cart-customer-input::placeholder { color: ${posTheme.textDim}; }
        .cart-customer-input:focus {
          outline: none;
          border-color: ${posTheme.goldBorder} !important;
          background: rgba(255,255,255,0.14) !important;
        }
        .cart-checkout-btn:hover:not(:disabled) {
          box-shadow: 0 8px 24px rgba(232,160,32,0.45) !important;
          transform: translateY(-1px);
        }
        .cart-checkout-btn:active:not(:disabled) { transform: scale(0.98); }
        .cart-checkout-btn { transition: all 0.18s ease; }
      `}</style>
    </div>
  )
}

function CartItem({ item, onUpdateQty }) {
  return (
    <div style={ci.row} className="cart-item-row">
      <span style={ci.icon}>{item.icon || '📦'}</span>

      <div style={ci.info}>
        <p style={ci.name}>{item.productName}</p>
        <p style={ci.meta}>
          {item.color} · Size {item.size}
        </p>
        <p style={ci.unitPrice}>KES {item.price?.toLocaleString()} ea.</p>
      </div>

      <div style={ci.qtyRow}>
        <button
          type="button"
          onClick={() => onUpdateQty(item.key, item.qty - 1)}
          style={{ ...ci.qtyBtn, ...(item.qty === 1 ? ci.qtyBtnDel : {}) }}
        >
          {item.qty === 1 ? '×' : '−'}
        </button>
        <span style={ci.qtyNum}>{item.qty}</span>
        <button type="button" onClick={() => onUpdateQty(item.key, item.qty + 1)} style={ci.qtyBtn}>
          +
        </button>
      </div>

      <p style={ci.lineTotal}>KES {(item.price * item.qty).toLocaleString()}</p>

      <style>{`
        .cart-item-row:hover { background: rgba(255,255,255,0.12) !important; }
      `}</style>
    </div>
  )
}

const s = {
  panel: {
    width: 'min(340px, 30vw)',
    minWidth: '270px',
    maxWidth: '380px',
    flexShrink: 0,
    background: posTheme.panelBg,
    borderLeft: `1px solid ${posTheme.panelBorder}`,
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1rem',
    borderBottom: `1px solid ${posTheme.panelBorder}`,
    flexShrink: 0,
    minHeight: '54px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: '1rem',
    color: posTheme.text,
    margin: 0,
  },
  badge: {
    background: posTheme.gold,
    color: posTheme.goldDark,
    fontSize: '0.7rem',
    fontWeight: 800,
    borderRadius: '999px',
    minWidth: '22px',
    height: '22px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fca5a5',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: '0.3rem 0.5rem',
    borderRadius: '6px',
    fontFamily: "'DM Sans', sans-serif",
  },
  customerWrap: {
    padding: '0.65rem 0.85rem',
    borderBottom: `1px solid ${posTheme.panelBorder}`,
    flexShrink: 0,
  },
  customerInput: {
    width: '100%',
    boxSizing: 'border-box',
    background: posTheme.inputBg,
    border: `1px solid ${posTheme.inputBorder}`,
    borderRadius: '12px',
    color: posTheme.text,
    fontSize: '0.83rem',
    padding: '0.6rem 0.85rem',
    minHeight: '42px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s, background 0.15s',
  },
  itemsScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.65rem 0.85rem',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingBottom: '2rem',
  },
  totals: {
    padding: '0.75rem 1rem',
    borderTop: `1px solid ${posTheme.panelBorder}`,
    flexShrink: 0,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '0.4rem',
  },
  totalLabel: {
    fontSize: '0.8rem',
    color: posTheme.textMuted,
  },
  totalValue: {
    fontSize: '0.8rem',
    color: posTheme.textSecondary,
    fontWeight: 500,
  },
  divider: {
    height: '1px',
    background: posTheme.panelBorder,
    margin: '0.5rem 0',
  },
  grandTotal: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 800,
    fontSize: '1.15rem',
    color: posTheme.gold,
  },
  checkoutWrap: {
    padding: '0.5rem 0.85rem 0.85rem',
    flexShrink: 0,
  },
  checkoutBtn: {
    width: '100%',
    minHeight: '50px',
    borderRadius: '14px',
    border: 'none',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
  },
  checkoutEnabled: {
    background: `linear-gradient(135deg, ${posTheme.gold} 0%, ${posTheme.goldLight} 100%)`,
    color: posTheme.goldDark,
    boxShadow: posTheme.goldGlow,
  },
  checkoutDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: posTheme.textDim,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  checkoutAmt: {
    fontSize: '0.82rem',
    fontWeight: 400,
    opacity: 0.85,
  },
}

const ci = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 0.6rem',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${posTheme.panelBorder}`,
    transition: 'background 0.15s',
  },
  icon: {
    fontSize: '1.2rem',
    flexShrink: 0,
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: posTheme.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  },
  meta: {
    fontSize: '0.7rem',
    color: posTheme.textMuted,
    margin: '0.1rem 0',
  },
  unitPrice: {
    fontSize: '0.7rem',
    color: 'rgba(232,160,32,0.9)',
    fontWeight: 600,
    margin: 0,
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
    flexShrink: 0,
  },
  qtyBtn: {
    minWidth: '30px',
    minHeight: '30px',
    borderRadius: '8px',
    border: `1px solid ${posTheme.inputBorder}`,
    background: 'rgba(255,255,255,0.10)',
    color: posTheme.text,
    fontSize: '1rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  qtyBtnDel: {
    color: '#fca5a5',
    borderColor: 'rgba(248,113,113,0.35)',
  },
  qtyNum: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: posTheme.text,
    width: '24px',
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: '0.8rem',
    fontWeight: 800,
    color: posTheme.gold,
    fontFamily: "'Space Grotesk', sans-serif",
    flexShrink: 0,
    minWidth: '70px',
    textAlign: 'right',
    margin: 0,
  },
}
