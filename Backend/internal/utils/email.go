package utils

import (
	"crypto/tls"
	"fmt"
	"html"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// FormatWIB formats a time.Time into standard Indonesian WIB date string (GMT+7)
func FormatWIB(t time.Time) string {
	wib := time.FixedZone("WIB", 7*3600)
	tWib := t.In(wib)

	months := [...]string{
		"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}

	month := int(tWib.Month())
	monthStr := "Bulan"
	if month >= 1 && month <= 12 {
		monthStr = months[month]
	}

	return fmt.Sprintf("%02d %s %d, %02d:%02d WIB",
		tWib.Day(), monthStr, tWib.Year(), tWib.Hour(), tWib.Minute())
}

func smtpTLSConfig(host string) *tls.Config {
	return &tls.Config{
		ServerName: host,
		MinVersion: tls.VersionTLS13,
	}
}

func getSMTPConfig() (host, port, user, password, fromName, fromEmail string) {
	host = os.Getenv("SMTP_HOST")
	if host == "" {
		host = "smtp.gmail.com"
	}
	port = os.Getenv("SMTP_PORT")
	if port == "" {
		port = "465"
	}
	user = strings.TrimSpace(os.Getenv("SMTP_USER"))
	if user == "" {
		user = strings.TrimSpace(os.Getenv("GMAIL_MAIL"))
	}
	password = strings.TrimSpace(os.Getenv("SMTP_PASSWORD"))
	if password == "" {
		password = strings.TrimSpace(os.Getenv("GMAIL_APP_PASSWORD"))
	}
	// Automatically strip spaces in Google App Password (e.g. "abcd efgh ijkl mnop")
	password = strings.ReplaceAll(password, " ", "")

	fromName = os.Getenv("SMTP_FROM_NAME")
	if fromName == "" {
		fromName = "Pasuruan Info"
	}
	fromEmail = strings.TrimSpace(os.Getenv("SMTP_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = user
	}
	return
}

// SendHTMLEmail sends an HTML email via Gmail/SMTP with multipart/related for inline CID images
// deliverHTMLEmail is the transport used by the Send*Email helpers (replaceable in tests).
var deliverHTMLEmail = SendHTMLEmail

func SendHTMLEmail(to string, subject string, htmlBody string) error {
	smtpHost, _, from, password, fromName, fromEmail := getSMTPConfig()

	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not configured in environment (SMTP_USER/SMTP_PASSWORD missing)")
	}

	boundary := fmt.Sprintf("----=_PasinfoPart_%d", time.Now().UnixNano())

	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", fromName, fromEmail)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = fmt.Sprintf("multipart/related; boundary=\"%s\"", boundary)
	headers["X-Priority"] = "1 (Highest)"
	headers["X-MSMail-Priority"] = "High"
	headers["Importance"] = "High"
	headers["X-Category"] = "Important"
	headers["Auto-Submitted"] = "auto-generated"

	var message strings.Builder
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")

	// Part 1: HTML Body
	message.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	message.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	message.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	message.WriteString(htmlBody)
	message.WriteString("\r\n\r\n")

	// Part 2: Inline Logo Attachment with Content-ID
	if LogoEmailPNGMIMEBody != "" {
		message.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		message.WriteString("Content-Type: image/png; name=\"logo.png\"\r\n")
		message.WriteString("Content-Transfer-Encoding: base64\r\n")
		message.WriteString("Content-ID: <logo_pasinfo>\r\n")
		message.WriteString("Content-Disposition: inline; filename=\"logo.png\"\r\n\r\n")
		message.WriteString(LogoEmailPNGMIMEBody)
		message.WriteString("\r\n\r\n")
	}

	message.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	rawMessage := message.String()
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Attempt 1: Port 465 with Direct SSL/TLS (12s timeout)
	tlsConfig := smtpTLSConfig(smtpHost)
	dialer := &net.Dialer{
		Timeout: 12 * time.Second,
	}

	conn465, err465 := tls.DialWithDialer(dialer, "tcp", smtpHost+":465", tlsConfig)
	if err465 == nil {
		defer conn465.Close()
		client, err := smtp.NewClient(conn465, smtpHost)
		if err == nil {
			defer client.Quit()
			if err = client.Auth(auth); err == nil {
				if err = client.Mail(from); err == nil {
					if err = client.Rcpt(to); err == nil {
						w, err := client.Data()
						if err == nil {
							_, _ = w.Write([]byte(rawMessage))
							_ = w.Close()
							return nil
						}
					}
				}
			}
		}
	}

	// Attempt 2: Port 587 with STARTTLS (12s timeout)
	conn587, err587 := net.DialTimeout("tcp", smtpHost+":587", 12*time.Second)
	if err587 == nil {
		defer conn587.Close()
		client, err := smtp.NewClient(conn587, smtpHost)
		if err == nil {
			defer client.Quit()
			if err = client.StartTLS(tlsConfig); err == nil {
				if err = client.Auth(auth); err == nil {
					if err = client.Mail(from); err == nil {
						if err = client.Rcpt(to); err == nil {
							w, err := client.Data()
							if err == nil {
								_, _ = w.Write([]byte(rawMessage))
								_ = w.Close()
								return nil
							}
						}
					}
				}
			}
		}
	}

	// Return composite error
	return fmt.Errorf("SMTP connection failed on port 465 (%v) and port 587 (%v)", err465, err587)
}

// ---------------------------------------------------------------------------
// Helper: Base Email Wrapper Template
// ---------------------------------------------------------------------------

func renderEmailContainer(headerGradient string, headerTitle string, headerSubtitle string, contentHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-text-size-adjust: 100%%; -ms-text-size-adjust: 100%%;">
  <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Logo Besar (CID Embedded Image) -->
          <tr>
            <td align="center" style="padding: 36px 24px 28px 24px; background: %s;">
              <div style="background-color: #ffffff; display: inline-block; padding: 14px 28px; border-radius: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.18);">
                <img src="cid:logo_pasinfo" alt="Pasuruan Info" width="220" style="display: block; height: auto; max-width: 220px; font-size: 22px; font-weight: 800; color: #1e3a8a; border: 0; outline: none; text-decoration: none;" />
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 18px; margin-bottom: 0; letter-spacing: -0.3px;">%s</h1>
              <p style="color: #bfdbfe; font-size: 13px; margin-top: 6px; margin-bottom: 0;">%s</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px 24px 28px;">
              %s
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 28px;">
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0;">
            </td>
          </tr>

          <!-- Footer Logo Kecil (CID Embedded Image) & Disclaimer -->
          <tr>
            <td align="center" style="padding: 24px 28px 32px 28px; background-color: #f8fafc;">
              <div style="margin-bottom: 12px;">
                <img src="cid:logo_pasinfo" alt="Pasuruan Info" width="110" style="display: block; height: auto; max-width: 110px; margin: 0 auto; border: 0;" />
              </div>
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 8px 0; max-width: 440px;">
                <em>Do not reply to this email. Automatically sent from Pasuruan Info System.</em><br>
                Email notifikasi ini dikirim secara otomatis oleh sistem Pasuruan Info.
              </p>
              <p style="font-size: 11px; color: #000000; margin: 0; font-weight: 500;">
                &copy; 2026 Pasuruan Info. Seluruh Hak Cipta Dilindungi.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, headerTitle, headerGradient, headerTitle, headerSubtitle, contentHTML)
}

// ---------------------------------------------------------------------------
// 1. SendRegisterOTPEmail (Aktivasi Akun Registrasi)
// ---------------------------------------------------------------------------

func SendRegisterOTPEmail(toEmail string, userName string, otp string) error {
	subject := "[Penting] Kode OTP Aktivasi Akun"
	if strings.TrimSpace(userName) == "" {
		userName = "Calon Pengguna Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	userName = html.EscapeString(userName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Terima kasih telah melakukan pendaftaran akun di <strong>Pasuruan Info</strong>. Untuk menyelesaikan pendaftaran dan memverifikasi alamat email Anda, gunakan kode OTP berikut:
      </p>

      <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 22px 20px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 1.5px; margin-bottom: 8px;">KODE OTP AKTIVASI ANDA</span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #15803d; letter-spacing: 10px; display: inline-block;">%s</span>
        <span style="display: block; font-size: 12px; color: #64748b; margin-top: 10px;">⏱️ Kode berlaku selama <strong>5 menit</strong></span>
      </div>

      <div style="background-color: #fffbebfb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
          <strong>Penting:</strong> Jangan berikan kode OTP ini kepada siapa pun. Pihak Pasuruan Info tidak akan pernah meminta kode aktivasi Anda.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Jika Anda tidak pernah merasa mendaftarkan akun di Pasuruan Info, silakan abaikan email ini.
      </p>
    `, userName, otp)

	html := renderEmailContainer(
		"linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)",
		"Aktivasi & Verifikasi Akun",
		"Portal Informasi & Berita Terkini Pasuruan",
		content,
	)

	return deliverHTMLEmail(toEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 2. SendWelcomeRegistrationEmail (Notifikasi Pendaftaran Berhasil)
// ---------------------------------------------------------------------------

func SendWelcomeRegistrationEmail(toEmail string, userName string, role string, formattedWibTime string) error {
	subject := "[Selamat Datang] Pendaftaran Akun Pasuruan Info Berhasil"
	if strings.TrimSpace(userName) == "" {
		userName = "Pengguna Pasuruan Info"
	}

	roleName := "Pembaca / Member"
	if strings.ToLower(role) == "penulis" {
		roleName = "Kontributor / Penulis Berita"
	}

	// Escape values from users/database before they are placed into HTML
	userName = html.EscapeString(userName)
	displayEmail := html.EscapeString(toEmail)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Selamat! Pendaftaran akun Anda di <strong>Pasuruan Info</strong> telah berhasil diverifikasi. Akun Anda kini telah aktif dan siap digunakan untuk mengakses seluruh layanan kami.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Nama Pengguna:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Email Terdaftar:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Peran Akun:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #059669; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Waktu Pendaftaran:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569;">%s</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 1.5;">
          <strong>Info:</strong> Anda dapat masuk menggunakan email dan password yang telah Anda buat pada saat pendaftaran.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih telah bergabung menjadi bagian dari komunitas Pasuruan Info.
      </p>
    `, userName, userName, displayEmail, roleName, formattedWibTime)

	html := renderEmailContainer(
		"linear-gradient(135deg, #059669 0%, #10b981 100%)",
		"Selamat Bergabung di Pasuruan Info!",
		"Akun Anda Berhasil Didaftarkan & Aktif",
		content,
	)

	return deliverHTMLEmail(toEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 3. SendOTPEmail (Pemulihan Password)
// ---------------------------------------------------------------------------

func SendOTPEmail(toEmail string, userName string, otp string) error {
	subject := "[Penting] Kode OTP Pemulihan Password"
	if strings.TrimSpace(userName) == "" {
		userName = "Pengguna Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	userName = html.EscapeString(userName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Kami menerima permintaan untuk melakukan pemulihan password akun Pasuruan Info Anda. Gunakan kode verifikasi OTP berikut untuk melanjutkan proses pembuatan password baru:
      </p>

      <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 22px 20px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1e40af; letter-spacing: 1.5px; margin-bottom: 8px;">KODE VERIFIKASI OTP ANDA</span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #1e3a8a; letter-spacing: 10px; display: inline-block;">%s</span>
        <span style="display: block; font-size: 12px; color: #64748b; margin-top: 10px;">⏱️ Kode berlaku selama <strong>5 menit</strong></span>
      </div>

      <div style="background-color: #fffbebfb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
          <strong>Penting:</strong> Jangan pernah memberikan kode OTP ini kepada siapa pun, termasuk pihak yang mengaku sebagai staf Pasuruan Info.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dan password Anda akan tetap aman.
      </p>
    `, userName, otp)

	html := renderEmailContainer(
		"linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
		"Permintaan Pemulihan Password",
		"Portal Informasi & Berita Terkini Pasuruan",
		content,
	)

	return deliverHTMLEmail(toEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 4. SendPasswordChangedEmail (Notifikasi Password Berhasil Diubah)
// ---------------------------------------------------------------------------

func SendPasswordChangedEmail(toEmail string, userName string, formattedWibTime string) error {
	subject := "[Pemberitahuan] Kata Sandi Akun Pasuruan Info Berhasil Diubah"
	if strings.TrimSpace(userName) == "" {
		userName = "Pengguna Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	userName = html.EscapeString(userName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Kami menginformasikan bahwa kata sandi untuk akun Pasuruan Info Anda telah berhasil diubah dan diperbarui pada sistem kami.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Perubahan:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Status:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #10b981;">✓ Berhasil Diperbarui</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #991b1b; margin: 0; line-height: 1.5;">
          <strong>Peringatan Keamanan:</strong> Jika Anda merasa <strong>tidak melakukan</strong> perubahan ini, segera hubungi tim bantuan Pasuruan Info untuk mengamankan akun Anda.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih telah menggunakan layanan Pasuruan Info.
      </p>
    `, userName, formattedWibTime)

	html := renderEmailContainer(
		"linear-gradient(135deg, #059669 0%, #10b981 100%)",
		"Kata Sandi Berhasil Diperbarui",
		"Portal Informasi & Berita Terkini Pasuruan",
		content,
	)

	return deliverHTMLEmail(toEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 5. SendNewsSubmittedAuthorEmail (Penulis Mengajukan Berita)
// ---------------------------------------------------------------------------

func SendNewsSubmittedAuthorEmail(toEmail string, authorName string, newsTitle string, categoryName string, formattedWibTime string) error {
	subject := "[Pengajuan Berita] Berita Anda Telah Berhasil Diajukan"
	if strings.TrimSpace(authorName) == "" {
		authorName = "Penulis Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	authorName = html.EscapeString(authorName)
	newsTitle = html.EscapeString(newsTitle)
	categoryName = html.EscapeString(categoryName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Artikel berita yang Anda tulis telah <strong>berhasil diajukan</strong> ke sistem Pasuruan Info dan saat ini sedang masuk ke dalam antrean peninjauan oleh tim Editor kami.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Kategori:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Pengajuan:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Status:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #d97706;">⏳ Menunggu Peninjauan Editor</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 1.5;">
          <strong>Alur Selanjutnya:</strong> Tim Editor akan meninjau kelayakan dan kelengkapan artikel Anda. Anda akan menerima notifikasi email setelah artikel disetujui atau memerlukan revisi.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih atas kontribusi karya berita Anda untuk Pasuruan Info.
      </p>
    `, authorName, newsTitle, categoryName, formattedWibTime)

	html := renderEmailContainer(
		"linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
		"Pengajuan Berita Berhasil",
		"Artikel Sedang Ditinjau oleh Tim Editor",
		content,
	)

	return deliverHTMLEmail(toEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 6. SendNewsSubmittedEditorEmail (Draft Berita Masuk untuk Editor)
// ---------------------------------------------------------------------------

func SendNewsSubmittedEditorEmail(editorEmail string, editorName string, authorName string, newsTitle string, categoryName string, formattedWibTime string) error {
	subject := "[Draft Masuk] Berita Baru Menunggu Peninjauan Editor"
	if strings.TrimSpace(editorName) == "" {
		editorName = "Editor Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	editorName = html.EscapeString(editorName)
	authorName = html.EscapeString(authorName)
	newsTitle = html.EscapeString(newsTitle)
	categoryName = html.EscapeString(categoryName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Terdapat <strong>draft berita baru</strong> yang diajukan oleh penulis dan membutuhkan peninjauan serta persetujuan Anda di panel editorial.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Nama Penulis:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #059669; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Kategori:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Waktu Pengajuan:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569;">%s</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #854d0e; margin: 0; line-height: 1.5;">
          <strong>Tindakan Diperlukan:</strong> Silakan masuk ke Dashboard Editor untuk membaca isi lengkap artikel, memberikan catatan revisi, atau menerbitkan berita.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Email otomatis dari Sistem Redaksi Pasuruan Info.
      </p>
    `, editorName, newsTitle, authorName, categoryName, formattedWibTime)

	html := renderEmailContainer(
		"linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
		"Draft Berita Menunggu Review",
		"Penugasan Editorial Pasuruan Info",
		content,
	)

	return deliverHTMLEmail(editorEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 7. SendNewsReviewApprovedEmail (Editor Menyetujui Berita)
// ---------------------------------------------------------------------------

func SendNewsReviewApprovedEmail(authorEmail string, authorName string, newsTitle string, categoryName string, formattedWibTime string, notes string) error {
	subject := "[Selamat!] Berita Anda Telah Disetujui & Diterbitkan"
	if strings.TrimSpace(authorName) == "" {
		authorName = "Penulis Pasuruan Info"
	}

	// Escape values from users/database before they are placed into HTML
	authorName = html.EscapeString(authorName)
	newsTitle = html.EscapeString(newsTitle)
	categoryName = html.EscapeString(categoryName)
	notes = html.EscapeString(notes)

	notesBlock := ""
	if strings.TrimSpace(notes) != "" {
		notesBlock = fmt.Sprintf(`
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-top: 8px; vertical-align: top;">Catatan Editor:</td>
            <td align="right" style="font-size: 14px; font-weight: 500; color: #334155; padding-top: 8px;"><em>"%s"</em></td>
          </tr>
        `, notes)
	}

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        <strong>Selamat!</strong> Artikel berita yang Anda ajukan telah <strong>disetujui oleh tim Editor</strong> dan saat ini telah resmi diterbitkan di portal Pasuruan Info.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Kategori:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Terbit:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Status:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #059669;">✓ Diterbitkan (Published)</td>
          </tr>
          %s
        </table>
      </div>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #166534; margin: 0; line-height: 1.5;">
          <strong>Selamat Berkontribusi:</strong> Artikel Anda kini dapat dibaca oleh seluruh masyarakat dan pembaca setia Pasuruan Info!
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih atas karya jurnalistik Anda yang berkualitas.
      </p>
    `, authorName, newsTitle, categoryName, formattedWibTime, notesBlock)

	html := renderEmailContainer(
		"linear-gradient(135deg, #059669 0%, #10b981 100%)",
		"Selamat! Berita Anda Diterbitkan",
		"Persetujuan Publikasi Berita Pasuruan Info",
		content,
	)

	return deliverHTMLEmail(authorEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 8. SendNewsReviewRevisionEmail (Editor Meminta Revisi)
// ---------------------------------------------------------------------------

func SendNewsReviewRevisionEmail(authorEmail string, authorName string, newsTitle string, categoryName string, formattedWibTime string, revisionNotes string) error {
	subject := "[Perlu Revisi!] Berita Anda Memerlukan Perbaikan"
	if strings.TrimSpace(authorName) == "" {
		authorName = "Penulis Pasuruan Info"
	}
	if strings.TrimSpace(revisionNotes) == "" {
		revisionNotes = "Mohon periksa kembali kelengkapan data, tata bahasa, dan sumber berita sebelum mengajukan ulang."
	}

	// Escape values from users/database before they are placed into HTML
	authorName = html.EscapeString(authorName)
	revisionNotes = html.EscapeString(revisionNotes)
	newsTitle = html.EscapeString(newsTitle)
	categoryName = html.EscapeString(categoryName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Artikel berita yang Anda ajukan saat ini <strong>Perlu Revisi!</strong> Tim Editor telah meninjau draft Anda dan meninggalkan catatan perbaikan berikut:
      </p>

      <div style="background-color: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 1px; margin-bottom: 8px;">CATATAN REVISI DARI EDITOR:</span>
        <p style="font-size: 15px; color: #78350f; line-height: 1.6; margin: 0; font-weight: 500;">
          "%s"
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Kategori:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Review:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Status Saat Ini:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #ea580c;">⚠️ Perlu Revisi</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 1.5;">
          <strong>Langkah Selanjutnya:</strong> Silakan masuk ke Dashboard Penulis, buka menu Berita Saya, pilih artikel terkait untuk melakukan perbaikan sesuai catatan editor, lalu ajukan kembali.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Semangat memperbaiki artikel Anda!
      </p>
    `, authorName, revisionNotes, newsTitle, categoryName, formattedWibTime)

	html := renderEmailContainer(
		"linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)",
		"Perlu Revisi! Perbaikan Artikel",
		"Hasil Peninjauan Editorial Pasuruan Info",
		content,
	)

	return deliverHTMLEmail(authorEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 9. SendNewsAdminEditedEmail (Admin Mengedit Berita Penulis)
// ---------------------------------------------------------------------------

func SendNewsAdminEditedEmail(authorEmail string, authorName string, newsTitle string, categoryName string, formattedWibTime string, adminName string) error {
	subject := "[Pemberitahuan] Berita Anda Telah Diperbarui oleh Admin"
	if strings.TrimSpace(authorName) == "" {
		authorName = "Penulis Pasuruan Info"
	}
	if strings.TrimSpace(adminName) == "" {
		adminName = "Administrator"
	}

	// Escape values from users/database before they are placed into HTML
	authorName = html.EscapeString(authorName)
	newsTitle = html.EscapeString(newsTitle)
	categoryName = html.EscapeString(categoryName)
	adminName = html.EscapeString(adminName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Kami menginformasikan bahwa artikel berita Anda telah <strong>diperbarui / disunting oleh Administrator (%s)</strong> pada sistem Pasuruan Info.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Kategori:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #2563eb; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Perubahan:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Disunting Oleh:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a;">%s</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 1.5;">
          <strong>Catatan:</strong> Perubahan dilakukan demi kesesuaian pedoman redaksi dan standar format publikasi Pasuruan Info.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih atas dedikasi dan kontribusi Anda.
      </p>
    `, authorName, adminName, newsTitle, categoryName, formattedWibTime, adminName)

	html := renderEmailContainer(
		"linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
		"Berita Diperbarui oleh Admin",
		"Pemberitahuan Redaksional Pasuruan Info",
		content,
	)

	return deliverHTMLEmail(authorEmail, subject, html)
}

// ---------------------------------------------------------------------------
// 10. SendNewsAdminDeletedEmail (Admin Menghapus Berita Penulis)
// ---------------------------------------------------------------------------

func SendNewsAdminDeletedEmail(authorEmail string, authorName string, newsTitle string, formattedWibTime string, adminName string) error {
	subject := "[Pemberitahuan] Berita Anda Telah Dihapus oleh Admin"
	if strings.TrimSpace(authorName) == "" {
		authorName = "Penulis Pasuruan Info"
	}
	if strings.TrimSpace(adminName) == "" {
		adminName = "Administrator"
	}

	// Escape values from users/database before they are placed into HTML
	authorName = html.EscapeString(authorName)
	newsTitle = html.EscapeString(newsTitle)
	adminName = html.EscapeString(adminName)

	content := fmt.Sprintf(`
      <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
        Halo <strong>%s</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Kami memberitahukan bahwa artikel berita Anda telah <strong>dihapus dari sistem oleh Administrator (%s)</strong>.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; vertical-align: top;">Judul Berita:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; padding-bottom: 8px; max-width: 320px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;">Waktu Penghapusan:</td>
            <td align="right" style="font-size: 14px; font-weight: 600; color: #475569; padding-bottom: 8px;">%s</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #64748b;">Dihapus Oleh:</td>
            <td align="right" style="font-size: 14px; font-weight: 700; color: #dc2626;">%s</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #991b1b; margin: 0; line-height: 1.5;">
          <strong>Info:</strong> Jika Anda memiliki pertanyaan mengenai penghapusan ini, Anda dapat menghubungi tim Redaksi Pasuruan Info.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Terima kasih atas pengertian dan kerjasamanya.
      </p>
    `, authorName, adminName, newsTitle, formattedWibTime, adminName)

	html := renderEmailContainer(
		"linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
		"Berita Dihapus oleh Admin",
		"Pemberitahuan Redaksional Pasuruan Info",
		content,
	)

	return deliverHTMLEmail(authorEmail, subject, html)
}
