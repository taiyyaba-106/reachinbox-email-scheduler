fetch('https://reachinbox-email-scheduler-1-17a7.onrender.com/api/emails/5')
  .then(res => res.json())
  .then(data => console.log('Email 5 Status:', data))
  .catch(err => console.error(err));
