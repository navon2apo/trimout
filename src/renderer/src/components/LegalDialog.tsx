/**
 * LegalDialog — combined Terms of Service + Privacy Policy modal.
 * Embedded in the app (no external page) so it works offline.
 * Triggered from the top-right ⚙ menu.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'terms' | 'privacy';

const SECTION_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.6,
  color: 'rgba(203,213,225,0.9)',
  marginBottom: 14,
};

const H_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: 6,
  marginTop: 14,
};

function TermsContent() {
  return (
    <div style={{ direction: 'rtl' }}>
      <p style={SECTION_STYLE}>
        ברוכים הבאים ל-TrimOut. שימושך באפליקציה מהווה הסכמה לתנאים הבאים.
      </p>

      <h3 style={H_STYLE}>1. רישיון השימוש</h3>
      <p style={SECTION_STYLE}>
        רכישת TrimOut מעניקה לך רישיון אישי, לא בלעדי, להתקנה ולשימוש באפליקציה
        על המחשבים שלך. אסור להפיץ, למכור או להעביר את המפתח לאחרים.
      </p>

      <h3 style={H_STYLE}>2. שימוש בתוכן</h3>
      <p style={SECTION_STYLE}>
        אתה האחראי הבלעדי לתוכן שאתה מעלה ועורך באפליקציה. עליך לוודא שיש לך
        זכויות שימוש מלאות בקבצי הווידאו, ולקבל הסכמת כל מי שמופיע בהם, במיוחד
        כאשר מדובר בקטינים.
      </p>

      <h3 style={H_STYLE}>3. הגבלת אחריות</h3>
      <p style={SECTION_STYLE}>
        TrimOut מסופקת &quot;כמות שהיא&quot; (AS IS). איננו אחראים לאובדן נתונים, לקבצים
        פגומים, או לנזק עקיף שייגרם משימוש בתוכנה. מומלץ לשמור עותקי גיבוי של
        קבצי המקור לפני עריכה.
      </p>

      <h3 style={H_STYLE}>4. רכיבים חיצוניים</h3>
      <p style={SECTION_STYLE}>
        TrimOut מבוססת על LosslessCut של Mikael Finstad (רישיון GPL-2.0)
        ומשתמשת ב-FFmpeg. הרכיבים החיצוניים כפופים לרישיונותיהם הנפרדים.
      </p>

      <h3 style={H_STYLE}>5. עדכונים והפסקת שירות</h3>
      <p style={SECTION_STYLE}>
        אנו עשויים להוציא עדכונים מעת לעת. אין התחייבות לזמינות שירות אונליין;
        האפליקציה פועלת לחלוטין מקומית ולא דורשת חיבור לאינטרנט לפעולתה הבסיסית.
      </p>

      <h3 style={H_STYLE}>6. תמיכה</h3>
      <p style={SECTION_STYLE}>
        לבעיות ובקשות פנו ל: info@demente-show.com
      </p>

      <p style={{ ...SECTION_STYLE, fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 18 }}>
        עודכן לאחרונה: 2026
      </p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div style={{ direction: 'rtl' }}>
      <p style={SECTION_STYLE}>
        TrimOut מכבדת את הפרטיות שלך. מסמך זה מסביר אילו נתונים נאספים ואילו לא.
      </p>

      <h3 style={H_STYLE}>1. עיבוד מקומי בלבד</h3>
      <p style={SECTION_STYLE}>
        כל עריכת הווידאו מתבצעת על המחשב שלך. קבצי הווידאו, הקליפים שיוצרת,
        השמות שאתה נותן והפעולות שאתה בוחר <strong>אינם נשלחים לאף שרת חיצוני</strong>.
      </p>

      <h3 style={H_STYLE}>2. נתונים נשמרים מקומית</h3>
      <p style={SECTION_STYLE}>
        האפליקציה שומרת על המחשב שלך:
        <br />• הגדרות משתמש (תיקיית ייצוא, איכות מועדפת)
        <br />• רישיון התוכנה
        <br />• קובץ metadata.json לצד הייצוא (אם בחרת ליצור)
      </p>

      <h3 style={H_STYLE}>3. בדיקת רישיון</h3>
      <p style={SECTION_STYLE}>
        בעת ההפעלה הראשונה, TrimOut מאמתת את הרישיון שלך מול שרת ההפצה. בבדיקה
        זו נשלחים רק: מפתח הרישיון, מזהה המכשיר (hash) וגרסת התוכנה. לא נאסף
        מידע אישי נוסף.
      </p>

      <h3 style={H_STYLE}>4. בדיקת עדכונים</h3>
      <p style={SECTION_STYLE}>
        האפליקציה עשויה לבדוק מעת לעת אם יש גרסה חדשה זמינה. בדיקה זו אנונימית
        ולא מזוהה אישית.
      </p>

      <h3 style={H_STYLE}>5. עוגיות ומעקב</h3>
      <p style={SECTION_STYLE}>
        אין עוגיות. אין analytics. אין שירותי צד שלישי שעוקבים אחר השימוש שלך.
      </p>

      <h3 style={H_STYLE}>6. ילדים</h3>
      <p style={SECTION_STYLE}>
        TrimOut מיועדת לבני 13+. במיוחד כאשר אתה עורך וידאו של ילדים, וודא שיש
        לך את הסמכות ההורית להפיץ את התוצרים.
      </p>

      <h3 style={H_STYLE}>7. פנייה</h3>
      <p style={SECTION_STYLE}>
        לבירורי פרטיות: info@demente-show.com
      </p>

      <p style={{ ...SECTION_STYLE, fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 18 }}>
        עודכן לאחרונה: 2026
      </p>
    </div>
  );
}

function LegalDialog({ visible, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '94vw',
              maxHeight: '86vh',
              background: 'rgba(13,17,27,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header with tabs */}
            <div style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
            }}
            >
              {(['terms', 'privacy'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: tab === t ? '#e2e8f0' : 'rgba(148,163,184,0.65)',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '14px 16px',
                    borderBottom: `2px solid ${tab === t ? '#14b8a6' : 'transparent'}`,
                    transition: 'color 0.12s, border-color 0.12s',
                  }}
                >
                  {t === 'terms' ? 'תנאי שימוש' : 'פרטיות'}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(148,163,184,0.7)',
                  fontSize: 20,
                  padding: '6px 12px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 22px 22px',
            }}
            >
              {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(LegalDialog);
