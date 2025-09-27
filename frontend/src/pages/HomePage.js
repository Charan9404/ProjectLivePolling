// src/pages/HomePage.js
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Welcome to Live Polling System</h2>
      <p>Select your role to continue:</p>
      <div style={{ marginTop: 20 }}>
        <Link to="/teacher"><button>I’m a Teacher</button></Link>
      </div>
      <div style={{ marginTop: 12 }}>
        <Link to="/student"><button>I’m a Student</button></Link>
      </div>
    </div>
  );
}
