//! Bitcoin Core RPC client service

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Bitcoin service (alias for RPC client)
pub type BitcoinService = BitcoinRpcClient;

/// Bitcoin Core RPC client
pub struct BitcoinRpcClient {
    url: String,
    user: String,
    password: String,
}

/// UTXO from listunspent
#[derive(Debug, Serialize, Deserialize)]
pub struct UnspentOutput {
    pub txid: String,
    pub vout: u32,
    pub address: String,
    pub script_pub_key: String,
    pub amount: f64,
    pub confirmations: u32,
    pub spendable: bool,
}

/// Block info
#[derive(Debug, Serialize, Deserialize)]
pub struct BlockchainInfo {
    pub chain: String,
    pub blocks: u64,
    pub headers: u64,
    pub best_block_hash: String,
}

impl BitcoinRpcClient {
    /// Create a new Bitcoin RPC client with explicit URL
    pub fn new(url: &str) -> Self {
        let user = std::env::var("BITCOIN_RPC_USER")
            .unwrap_or_else(|_| "charms".to_string());
        let password = std::env::var("BITCOIN_RPC_PASSWORD")
            .unwrap_or_else(|_| "charms".to_string());

        Self { url: url.to_string(), user, password }
    }

    /// Create a new Bitcoin RPC client from environment
    pub fn from_env() -> Result<Self> {
        let url = std::env::var("BITCOIN_RPC_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:48332".to_string());
        Ok(Self::new(&url))
    }

    /// Make an RPC call
    async fn rpc_call<T: for<'de> Deserialize<'de>>(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<T> {
        let client = reqwest::Client::new();
        
        let response = client
            .post(&self.url)
            .basic_auth(&self.user, Some(&self.password))
            .json(&serde_json::json!({
                "jsonrpc": "2.0",
                "id": "liquid-nation",
                "method": method,
                "params": params
            }))
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;
        
        if let Some(error) = result.get("error") {
            if !error.is_null() {
                anyhow::bail!("RPC error: {}", error);
            }
        }

        let result_value = result.get("result")
            .ok_or_else(|| anyhow::anyhow!("No result in response"))?;
        
        Ok(serde_json::from_value(result_value.clone())?)
    }

    /// Get blockchain info
    pub async fn get_blockchain_info(&self) -> Result<BlockchainInfo> {
        self.rpc_call("getblockchaininfo", serde_json::json!([])).await
    }

    /// Get new address
    pub async fn get_new_address(&self, label: Option<&str>) -> Result<String> {
        let params = match label {
            Some(l) => serde_json::json!([l]),
            None => serde_json::json!([]),
        };
        self.rpc_call("getnewaddress", params).await
    }

    /// List unspent outputs
    pub async fn list_unspent(
        &self,
        min_conf: Option<u32>,
        max_conf: Option<u32>,
    ) -> Result<Vec<UnspentOutput>> {
        let params = serde_json::json!([
            min_conf.unwrap_or(1),
            max_conf.unwrap_or(9999999)
        ]);
        self.rpc_call("listunspent", params).await
    }

    /// Get wallet balance
    pub async fn get_balance(&self) -> Result<f64> {
        self.rpc_call("getbalance", serde_json::json!([])).await
    }

    /// Send raw transaction
    pub async fn send_raw_transaction(&self, hex: &str) -> Result<String> {
        self.rpc_call("sendrawtransaction", serde_json::json!([hex])).await
    }

    /// Get transaction
    pub async fn get_transaction(&self, txid: &str) -> Result<serde_json::Value> {
        self.rpc_call("gettransaction", serde_json::json!([txid])).await
    }

    /// Get raw transaction
    pub async fn get_raw_transaction(&self, txid: &str, verbose: bool) -> Result<serde_json::Value> {
        self.rpc_call("getrawtransaction", serde_json::json!([txid, verbose])).await
    }
}

impl Default for BitcoinRpcClient {
    fn default() -> Self {
        Self::from_env().expect("Failed to create Bitcoin RPC client")
    }
}

