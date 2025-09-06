using Microsoft.AspNetCore.Mvc;

namespace BacktestService.Controllers
{
	[ApiController]
	[Route("/")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok("OK");
		}
	}
}

