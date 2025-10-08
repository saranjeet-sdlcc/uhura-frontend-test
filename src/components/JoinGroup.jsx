import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function JoinGroup({ jwt }) {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const joinGroup = async () => {
      try {
        const res = await fetch(`http://localhost:4002/groups/invite/${token}/join`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = await res.json();
        if (data.success) {
          alert("Successfully joined the group!");
          navigate(`/groups/${data.group.groupId}`);
        } else {
          alert("Failed to join group: " + data.error);
          navigate("/groups");
        }
      } catch (e) {
        console.error("joinGroup error:", e);
        alert("Error joining group");
        navigate("/groups");
      }
    };
    if (jwt && token) joinGroup();
  }, [jwt, token, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      Joining group...
    </div>
  );
}