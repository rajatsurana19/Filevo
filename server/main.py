import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI,WebSocket
from fastapi.middleware.cors import CORSMiddleware

