//! Charms protocol service
//!
//! Handles spell building, proving, and transaction management

use anyhow::Result;
use serde::{Deserialize, Serialize, Serializer};
use serde_yaml;
use std::collections::BTreeMap;

/// Charms prover service
pub struct CharmsService {
    api_url: String,
    mock_mode: bool,
}

/// Spell prove request - sent to Charms Prover API
#[derive(Debug, Serialize)]
pub struct SpellProveRequest {
    #[serde(serialize_with = "serialize_spell")]
    pub spell: String, // YAML string that will be parsed to JSON object
    pub binaries: BTreeMap<String, Vec<u8>>,
    pub prev_txs: Vec<String>,
    pub funding_utxo: String,
    pub funding_utxo_value: u64,
    pub change_address: String,
    pub fee_rate: f64,
    pub chain: String,
}

/// Custom serializer to convert YAML string to JSON object
fn serialize_spell<S>(spell_yaml: &str, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    // Parse YAML string to Value
    let yaml_value: serde_yaml::Value = serde_yaml::from_str(spell_yaml)
        .map_err(|e| serde::ser::Error::custom(format!("Failed to parse spell YAML: {}", e)))?;
    
    // Serialize as JSON object
    yaml_value.serialize(serializer)
}

/// Transaction from prove response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvedTransaction {
    pub hex: String,
    pub txid: String,
}

/// Order data for spell building
#[derive(Debug, Clone)]
pub struct OrderSpellData {
    pub maker_address: String,
    pub maker_pubkey: String,
    pub offer_token_id: String,
    pub offer_token_vk: String,
    pub offer_amount: String,
    pub want_token_id: String,
    pub want_amount: String,
    pub expiry_height: u64,
    pub allow_partial: bool,
    pub funding_utxo: String,
    pub escrow_address: String,
    pub dest_chain: u8,
    pub dest_address: String,
}

/// Fill order data for spell building
#[derive(Debug, Clone)]
pub struct FillSpellData {
    pub order_utxo: String,
    pub taker_utxo: String,
    pub taker_pubkey: String,
    pub taker_address: String,
    pub maker_address: String,
    pub offer_amount: String,
    pub want_amount: String,
    pub fill_amount: Option<String>,
}

impl CharmsService {
    /// Create a new Charms service
    pub fn new() -> Self {
        let api_url = std::env::var("CHARMS_PROVE_API_URL")
            .unwrap_or_else(|_| "https://v8.charms.dev/spells/prove".to_string());
        
        let mock_mode = std::env::var("MOCK_MODE")
            .map(|v| v == "true")
            .unwrap_or(true);

        Self { api_url, mock_mode }
    }

    /// Build a spell from template with variable substitution
    pub fn build_spell(
        &self,
        template: &str,
        variables: &BTreeMap<String, String>,
    ) -> Result<String> {
        let mut spell = template.to_string();
        
        for (key, value) in variables {
            spell = spell.replace(&format!("${{{}}}", key), value);
        }

        Ok(spell)
    }

    /// Build create-order spell with all variables
    pub fn build_create_order_spell(
        &self,
        template: &str,
        data: &OrderSpellData,
        app_id: &str,
        app_vk: &str,
    ) -> Result<String> {
        let mut vars = BTreeMap::new();
        
        // App configuration
        vars.insert("app_id".to_string(), app_id.to_string());
        vars.insert("app_vk".to_string(), app_vk.to_string());
        
        // Token configuration
        vars.insert("offer_token_id".to_string(), data.offer_token_id.clone());
        vars.insert("offer_token_vk".to_string(), data.offer_token_vk.clone());
        vars.insert("want_token_id".to_string(), data.want_token_id.clone());
        
        // Order details
        vars.insert("maker_pubkey".to_string(), data.maker_pubkey.clone());
        vars.insert("offer_amount".to_string(), data.offer_amount.clone());
        vars.insert("want_amount".to_string(), data.want_amount.clone());
        vars.insert("expiry_height".to_string(), data.expiry_height.to_string());
        vars.insert("allow_partial".to_string(), data.allow_partial.to_string());
        
        // UTXOs and addresses
        vars.insert("in_utxo_0".to_string(), data.funding_utxo.clone());
        vars.insert("addr_escrow".to_string(), data.escrow_address.clone());
        
        // Cross-chain (optional)
        vars.insert("dest_chain".to_string(), data.dest_chain.to_string());
        vars.insert("dest_address".to_string(), data.dest_address.clone());
        
        // Defaults
        vars.insert("min_fill_amount".to_string(), "0".to_string());
        vars.insert("current_height".to_string(), "0".to_string());

        self.build_spell(template, &vars)
    }

    /// Build fill-order spell
    pub fn build_fill_order_spell(
        &self,
        template: &str,
        data: &FillSpellData,
        order_data: &OrderSpellData,
        app_id: &str,
        app_vk: &str,
    ) -> Result<String> {
        let mut vars = BTreeMap::new();
        
        // App configuration
        vars.insert("app_id".to_string(), app_id.to_string());
        vars.insert("app_vk".to_string(), app_vk.to_string());
        vars.insert("offer_token_id".to_string(), order_data.offer_token_id.clone());
        vars.insert("offer_token_vk".to_string(), order_data.offer_token_vk.clone());
        vars.insert("want_token_id".to_string(), order_data.want_token_id.clone());
        vars.insert("want_token_vk".to_string(), order_data.offer_token_vk.clone()); // Assuming same VK
        
        // Order state
        vars.insert("order_utxo".to_string(), data.order_utxo.clone());
        vars.insert("taker_utxo".to_string(), data.taker_utxo.clone());
        vars.insert("maker_pubkey".to_string(), order_data.maker_pubkey.clone());
        vars.insert("taker_pubkey".to_string(), data.taker_pubkey.clone());
        
        // Amounts
        vars.insert("offer_amount".to_string(), data.offer_amount.clone());
        vars.insert("want_amount".to_string(), data.want_amount.clone());
        
        // Addresses
        vars.insert("addr_maker".to_string(), data.maker_address.clone());
        vars.insert("addr_taker".to_string(), data.taker_address.clone());
        
        // Order metadata (for verification)
        vars.insert("dest_chain".to_string(), order_data.dest_chain.to_string());
        vars.insert("dest_address".to_string(), order_data.dest_address.clone());
        vars.insert("expiry_height".to_string(), order_data.expiry_height.to_string());
        vars.insert("allow_partial".to_string(), order_data.allow_partial.to_string());
        vars.insert("min_fill_amount".to_string(), "0".to_string());
        vars.insert("created_at".to_string(), "0".to_string());

        self.build_spell(template, &vars)
    }

    /// Prove a spell - calls Charms Prover API
    pub async fn prove_spell(
        &self,
        request: SpellProveRequest,
    ) -> Result<Vec<ProvedTransaction>> {
        if self.mock_mode {
            tracing::info!("Mock mode: returning simulated transaction");
            // Return mock transactions for development
            return Ok(vec![
                ProvedTransaction {
                    hex: self.generate_mock_tx_hex(),
                    txid: format!("mock_{}", uuid::Uuid::new_v4()),
                },
            ]);
        }

        tracing::info!("Calling Charms Prover API at {}", self.api_url);
        
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120)) // ZK proofs take time
            .build()?;
        
        let response = client
            .post(&self.api_url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error = response.text().await?;
            anyhow::bail!("Prover API error ({}): {}", status, error);
        }

        let txs: Vec<ProvedTransaction> = response.json().await?;
        tracing::info!("Received {} transactions from prover", txs.len());
        Ok(txs)
    }

    /// Generate a mock transaction hex for testing
    fn generate_mock_tx_hex(&self) -> String {
        // This is a valid-looking but fake transaction structure
        // Version (4 bytes) + Input count (1 byte) + ... simplified
        "0200000001".to_string() + 
        &"00".repeat(32) +  // Prev txid
        "00000000" +        // Prev vout
        "00" +              // Script length
        "ffffffff" +        // Sequence
        "01" +              // Output count
        "0000000000000000" + // Value
        "00" +              // Script length
        "00000000"          // Locktime
    }

    /// Validate a spell locally before proving
    pub fn validate_spell(&self, spell_yaml: &str) -> Result<()> {
        // Parse YAML
        let spell: serde_yaml::Value = serde_yaml::from_str(spell_yaml)?;
        
        // Check version
        if let Some(version) = spell.get("version") {
            let v = version.as_u64().unwrap_or(0);
            if v != 8 {
                anyhow::bail!("Invalid spell version: expected 8, got {}", v);
            }
        } else {
            anyhow::bail!("Spell missing version field");
        }
        
        // Check required fields
        if spell.get("apps").is_none() {
            anyhow::bail!("Spell missing 'apps' field");
        }
        if spell.get("ins").is_none() {
            anyhow::bail!("Spell missing 'ins' field");
        }
        if spell.get("outs").is_none() {
            anyhow::bail!("Spell missing 'outs' field");
        }
        
        Ok(())
    }

    /// Check if service is in mock mode
    pub fn is_mock_mode(&self) -> bool {
        self.mock_mode
    }
}

/// Information about a charm on a UTXO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharmInfo {
    pub app_id: String,
    pub app_vk: String,
    pub tag: String,
    pub data: serde_json::Value,
}

impl Default for CharmsService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_spell() {
        let service = CharmsService::new();
        
        let template = "version: 8\naddress: ${addr}\namount: ${amount}";
        let mut vars = BTreeMap::new();
        vars.insert("addr".to_string(), "tb1q...".to_string());
        vars.insert("amount".to_string(), "1000".to_string());
        
        let result = service.build_spell(template, &vars).unwrap();
        assert!(result.contains("tb1q..."));
        assert!(result.contains("1000"));
    }

    #[test]
    fn test_validate_spell() {
        let service = CharmsService::new();
        
        let valid_spell = r#"
version: 8
apps:
  $TOKEN: t/abc/def
ins:
  - utxo_id: test
outs:
  - address: test
"#;
        
        assert!(service.validate_spell(valid_spell).is_ok());
    }

    #[test]
    fn test_validate_spell_invalid() {
        let service = CharmsService::new();
        
        let invalid_spell = "version: 7\napps: {}";
        assert!(service.validate_spell(invalid_spell).is_err());
    }
}
