javascript:(function() {
  const messages = document.getElementsByClassName("x78zum5 xdt5ytf x1iyjqo2 xs83m0k x1xzczws x6ikm8r x1rife3k x1n2onr6 xh8yej3")[1].childNodes[2];
  
  messages.removeEventListener("DOMNodeInserted", null);
  
  messages.addEventListener("DOMNodeInserted", async (event) => {
    const imgSrc = event?.target?.getElementsByTagName("img")[1]?.src;
    if (imgSrc) {
      try {
        const res = await fetch("http://localhost:3103/api/gpt-4-vision", {
          method: "POST",
          body: JSON.stringify({ imageUrl: imgSrc }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        console.log('GPT-4 Vision Analysis:', data.analysis);
      } catch (error) {
        console.error('Error sending image to server:', error);
      }
    }
  });
  
  alert("Added Messenger Chat Observer");
})(); 