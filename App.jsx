import React, { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import './style.css';

const socket = io("http://localhost:3001");

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  const handleUsername = useCallback(() => {
    if (!localStorage.getItem("chatUsername")) {
      const name = prompt("Enter your username:");
      if (name && name.trim()) {
        localStorage.setItem("chatUsername", name.trim());
        setUsername(name.trim());
        socket.emit("join", name.trim());
      }
    } else {
      const savedName = localStorage.getItem("chatUsername");
      setUsername(savedName);
      socket.emit("join", savedName);
    }
  }, []);

  useEffect(() => {
    handleUsername();

    socket.on("connect", () => setIsConnected(true));
    socket.on("online users", setOnlineUsers);
    socket.on("typing", setTypingUsers);
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, { ...msg, id: Date.now() + Math.random() }]);
    });
    socket.on("user joined", (user) => {
      setMessages((prev) => [...prev, {
        username: "System",
        text: `${user} joined the chat`,
        time: new Date().toLocaleTimeString(),
        system: true,
        id: Date.now() + Math.random()
      }]);
    });
    socket.on("user left", (user) => {
      setMessages((prev) => [...prev, {
        username: "System",
        text: `${user} left the chat`,
        time: new Date().toLocaleTimeString(),
        system: true,
        id: Date.now() + Math.random()
      }]);
    });
    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      socket.off("connect");
      socket.off("online users");
      socket.off("typing");
      socket.off("message");
      socket.off("user joined");
      socket.off("user left");
      socket.off("disconnect");
    };
  }, [handleUsername]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (value.trim() && username) {
      socket.emit("typing", true);
      setIsTyping(true);
      typingTimerRef.current = setTimeout(() => {
        socket.emit("typing", false);
        setIsTyping(false);
      }, 1000);
    } else {
      socket.emit("typing", false);
      setIsTyping(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !username || !isConnected) return;
    socket.emit("message", input.trim());
    setInput("");
    inputRef.current.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!username) {
    return (
      <div className={`full-screen-prompt ${darkMode ? 'dark' : ''}`}>
        <div className="prompt-box">
          <h1>🎉 Real-Time Chat</h1>
          <p>Enter username to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header">
        <h1>💬 Real-Time Chat {isConnected ? "🟢" : "🔴"}</h1>
        <p>Connected as: <strong>{username}</strong></p>
        <div className="status">
          Online: {onlineUsers.length} |
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <h4>Online Users ({onlineUsers.length})</h4>
          <ul>
            {onlineUsers.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ul>
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.slice(0, 2).join(', ')}{typingUsers.length > 2 && ` +${typingUsers.length - 2}`} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>

        <div className="chat-section">
          <div className="chat-box">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.system ? 'system' : ''} ${msg.username === username ? 'own' : ''}`}>
                <div className="message-content">
                  <div className="username">{msg.username}</div>
                  <div className="text">{msg.text}</div>
                  <div className="time">{msg.time}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-box">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message (Enter to send)..."
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!isConnected || isTyping}>
              {isTyping ? "⏳" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
