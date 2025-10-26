async function postJson(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

const emailInput = document.getElementById('email');
const sendBtn = document.getElementById('sendBtn');
const stepVerify = document.getElementById('step-verify');
const codeInput = document.getElementById('code');
const verifyBtn = document.getElementById('verifyBtn');
const verifyMsg = document.getElementById('verifyMsg');
const resultDiv = document.getElementById('result');

sendBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) { alert('Enter an email'); return; }
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  const res = await postJson('/send-code', { email });
  sendBtn.disabled = false;
  sendBtn.textContent = 'Send verification code';
  if (res.ok) {
    stepVerify.style.display = 'block';
    verifyMsg.textContent = 'Code sent — check your email.';
  } else {
    verifyMsg.textContent = (res.error || 'Failed to send');
    stepVerify.style.display = 'block';
  }
});

verifyBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const code = codeInput.value.trim();
  if (!email || !code) { alert('Provide email and code'); return; }
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying...';
  const res = await postJson('/verify-code', { email, code });
  verifyBtn.disabled = false;
  verifyBtn.textContent = 'Verify & Register';
  if (res.ok) {
    resultDiv.textContent = res.message || 'Verified';
  } else {
    verifyMsg.textContent = res.error || 'Verification failed';
  }
});
