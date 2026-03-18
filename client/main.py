import asyncio
import sys 
import typer
from rich.console import Console
from rich.progress import Progress, BarColumn, TextColumn, TimeElapsedColumn
from rich.panel import Panel
from rich import print as rprint

app = typer.Typer(help="Filevo — P2P file transfer over relay")
console = Console()

DEFAULT_URL = "ws://localhost:8000/ws"

@app.command()
def receive(
    output: str = typer.Option("./received","--output","-o",help="Directory to save received files"),
    url: str = typer.Option(DEFAULT_URL,"--url","-u",help="Relay WebSocket URL"),
):
    from client.downloader import receive as _receive

    console.print(Panel.fit(
        "[bold purple]Filevo[/bold purple] — Receive Mode\n"
        f"[dim]Relay: {url}[/dim]",
        border_style="purple"
    ))

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = None
        def on_ready(peer_id: str):
            console.print(f"\n[bold green]✓ Connected![/bold green]")
            console.print(f"[dim]Your Peer ID:[/dim] [bold cyan]{peer_id}[/bold cyan]")
            console.print("[dim]Share this ID with the sender. Waiting for files…[/dim]\n")
        
        def on_progress(file_name: str,pct:int,received:int,total:int):
            nonlocal task
            if task is None:
                task = progress.add_task(f"[cyan]Receiving {file_name}...",total=100)
            progress.update(task,completed=pct)

        def on_complete(file_path: str):
            nonlocal task
            if task is not None:
                progress.update(task,completed=100)
                task = None
            console.print(f"\n[bold green]✓ File saved:[/bold green] {file_path}\n")

        try:
            asyncio.run(_receive(
                ws_url=url,
                output_dir=output,
                on_ready=on_ready,
                on_progress=on_progress,
                on_complete=on_complete,
            ))
        except KeyboardInterrupt:
            console.print("\n[yellow]Disconnected.[/yellow]")


@app.command()
def send(
    file_path: str = typer.Argument(..., help="Path to the file you want to send"),
    target_id: str = typer.Argument(..., help="Peer ID of the receiver (e.g. filevo_abc123)"),
    url:       str = typer.Option(DEFAULT_URL, "--url", "-u", help="Relay WebSocket URL"),
):
    import os
    from client.uploader import upload

    if not os.path.exists(file_path):
        console.print(f"[red]✕ File not found:[/red] {file_path}")
        raise typer.Exit(1)

    file_size = os.path.getsize(file_path)
    file_name = os.path.basename(file_path)

    console.print(Panel.fit(
        f"[bold purple]Filevo[/bold purple] — Send Mode\n"
        f"[dim]File:[/dim]   [white]{file_name}[/white] [dim]({file_size:,} bytes)[/dim]\n"
        f"[dim]Target:[/dim] [cyan]{target_id}[/cyan]\n"
        f"[dim]Relay:[/dim]  {url}",
        border_style="purple",
    ))

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.percentage:>3.0f}%"),
        TextColumn("[dim]{task.fields[chunks]}[/dim]"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:

        task = progress.add_task(f"[cyan]Sending {file_name}…", total=100, chunks="")

        def on_progress(pct: int, sent: int, total: int):
            progress.update(task, completed=pct, chunks=f"{sent}/{total} chunks")

        try:
            asyncio.run(upload(
                file_path      = file_path,
                target_peer_id = target_id,
                ws_url         = url,
                on_progress    = on_progress,
            ))
            console.print(f"\n[bold green]✓ File sent successfully![/bold green]")
        except ConnectionRefusedError:
            console.print(f"\n[red]✕ Could not connect to relay at {url}[/red]")
            console.print("[dim]Make sure the relay server is running.[/dim]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"\n[red]✕ Error:[/red] {e}")
            raise typer.Exit(1)
        
if __name__ == "__main__":
    app()
