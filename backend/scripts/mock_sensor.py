import numpy as np

def generate_wingbeat(duration_sec: float = 0.1, sample_rate: int = 16000, fund_freq: float = 600.0) -> np.ndarray:
    """
    Generates a synthetic mosquito wingbeat signal simulating optical sensor telemetry.
    
    Args:
        duration_sec: Duration of the signal in seconds.
        sample_rate: The sampling rate in Hz.
        fund_freq: Fundamental frequency in Hz (typically 400-800Hz for mosquitoes).
        
    Returns:
        A NumPy array containing the synthetic waveform.
    """
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    
    # Fundamental frequency (Wingbeat)
    signal = 0.5 * np.sin(2 * np.pi * fund_freq * t)
    
    # Add harmonics (overtones caused by wing mechanics)
    signal += 0.25 * np.sin(2 * np.pi * (fund_freq * 2) * t)
    signal += 0.10 * np.sin(2 * np.pi * (fund_freq * 3) * t)
    
    # Add ambient sensor white noise
    noise = np.random.normal(0, 0.05, signal.shape)
    
    return signal + noise
