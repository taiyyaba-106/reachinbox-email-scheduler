const futureDate = new Date(Date.now() + 5000).toISOString();
console.log('Scheduling email for:', futureDate);

fetch('https://reachinbox-email-scheduler-1-17a7.onrender.com/api/emails/schedule', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient: 'taiyyaba106@gmail.com',
    subject: 'Final Delivery Test',
    body: 'Testing email scheduler delivery system',
    scheduledAt: futureDate
  })
})
.then(res => res.json())
.then(data => console.log('Schedule Response:', data))
.catch(err => console.error(err));
