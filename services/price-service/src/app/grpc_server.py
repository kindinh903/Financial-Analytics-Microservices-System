import asyncio
import logging
from concurrent import futures

import grpc

from app.services.price_service import price_service
from app.config import SYMBOL_WHITELIST

# Generated modules will be available after protoc step during build/runtime
from app.grpc import price_pb2, price_pb2_grpc

logger = logging.getLogger(__name__)


class PriceServiceGrpc(price_pb2_grpc.PriceServiceServicer):
    async def GetHistoricalData(self, request, context):
        try:
            symbol = request.symbol
            interval = request.interval or "1m"
            limit = request.limit or 500
            start_time = request.start_time_ms if request.start_time_ms != 0 else None
            end_time = request.end_time_ms if request.end_time_ms != 0 else None

            if symbol not in SYMBOL_WHITELIST:
                await context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"Symbol {symbol} not supported")

            candles = await price_service.get_candles(symbol, interval, limit=limit, start_time=start_time, end_time=end_time)

            resp = price_pb2.GetHistoricalDataResponse()
            for c in candles:
                # c may come from different sources; normalize keys
                item = price_pb2.CandleData(
                    open_time=int(c.get("open_time") or c.get("close_time") or 0) - 60_000,
                    open=float(c.get("open", 0.0)),
                    high=float(c.get("high", 0.0)),
                    low=float(c.get("low", 0.0)),
                    close=float(c.get("close", 0.0)),
                    volume=float(c.get("volume", 0.0)),
                    close_time=int(c.get("close_time", 0)),
                )
                resp.candles.append(item)
            return resp
        except Exception as e:
            logger.exception("gRPC GetHistoricalData error")
            await context.abort(grpc.StatusCode.INTERNAL, str(e))


async def serve_async(port: int = 9090):
    server = grpc.aio.server()
    price_pb2_grpc.add_PriceServiceServicer_to_server(PriceServiceGrpc(), server)
    server.add_insecure_port(f"0.0.0.0:{port}")
    logger.info(f"Starting gRPC server on {port}")
    await server.start()
    await server.wait_for_termination()


def serve(port: int = 9090):
    asyncio.run(serve_async(port))


