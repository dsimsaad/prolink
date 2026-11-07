from pathlib import Path
import trustme

# Write a local CA and a localhost certificate so clients verify STARTTLS normally.
def write_dev_certs(folder: str | Path = "certs") -> tuple[Path, Path, Path]:
    out = Path(folder)
    out.mkdir(parents=True, exist_ok=True)
    ca = trustme.CA()
    srv = ca.issue_cert("localhost", "127.0.0.1")
    ca.cert_pem.write_to_path(out / "ca.pem")
    srv.cert_chain_pems[0].write_to_path(out / "server.pem")
    srv.private_key_pem.write_to_path(out / "server.key")
    return out / "ca.pem", out / "server.pem", out / "server.key"

if __name__ == "__main__":
    print("wrote", ", ".join(map(str, write_dev_certs())))
