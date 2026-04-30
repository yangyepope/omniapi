// extract_cpg.sc
//
// 🔴🔴🔴 重要：当前是基础版本 🔴🔴🔴
//
// 仅导出 controllers / methods / calls / sql_sinks 节点；
// **paths 字段（Source→Sink 数据流）当前返回空数组**！
//
// 真实的污点分析依赖 Python 端 cpg/call_chain.py 的 Neo4j 查询 +
// call_chain_resolver.py 启发式兜底，精度受限。
//
// 投产前必须补 reachableByFlows：
//
//   val sources = cpg.parameter.where(_.method.annotation.name(
//     "RequestParam","RequestBody","PathVariable","RequestHeader"))
//   val sinks   = cpg.call.name("executeQuery","createNativeQuery",
//     "execute","queryForObject","queryForList")
//   val flows   = sinks.reachableByFlows(sources).map { f =>
//     Map(
//       "sink_method" -> f.elements.last.code,
//       "source_kind" -> "user_input",
//       "call_chain" -> f.elements.map(_.code).toList,
//       "file_path"  -> f.elements.last.method.filename,
//       "line_number"-> f.elements.last.lineNumber.getOrElse(0)
//     )
//   }
//
// 然后在 sb 中追加序列化 flows 到 paths 字段。
//
// ────────────────────────────────────────────────────────────
//
// 用法：joern --script extract_cpg.sc --params cpgPath=...,outPath=...,service=...
//
// 输入：cpg.bin 路径
// 输出：JSON 文件，结构：
//   {
//     "nodes": {
//       "controllers": [{signature, cls, method, http_method, path, file, line}, ...],
//       "methods":     [{signature, cls, name, file, line}, ...],
//       "calls":       [{caller_signature, callee_signature}, ...],
//       "sql_sinks":   [{owner_signature, file, line, sql_pattern, has_injection_risk, kind}, ...],
//       "feign_calls": [{caller_signature, target_service, target_method, file, line}, ...],
//       "endpoints":   [...]   // 与 controllers 字段一致，便于复用
//     },
//     "paths": []   // ⚠️ 当前未实现：Source→Sink 流分析待补
//   }
//
// 实现方式：以 ujson 序列化结构化结果。规模较大时建议增量分批 flush。

import io.shiftleft.codepropertygraph.generated.{Cpg => CpgT}
import io.shiftleft.semanticcpg.language._
import io.joern.console._
import io.shiftleft.codepropertygraph.generated.nodes._

import java.nio.file.{Files, Paths}
import java.nio.charset.StandardCharsets
import scala.collection.mutable.ListBuffer

// ── 入参解析 ───────────────────────────────────────────────────
val cpgPath: String = sys.props.getOrElse("cpgPath", "")
val outPath: String = sys.props.getOrElse("outPath", "")
val service: String = sys.props.getOrElse("service", "unknown")

if (cpgPath.isEmpty || outPath.isEmpty) {
  println("missing required params cpgPath/outPath")
  System.exit(2)
}

// ── 加载 CPG ──────────────────────────────────────────────────
importCpg(cpgPath)

// ── 简单的 JSON 序列化（避免外部依赖）──────────────────────────
def esc(s: String): String =
  s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")

def kv(k: String, v: String, q: Boolean = true): String =
  if (q) s""""$k":"${esc(v)}""""
  else   s""""$k":$v"""

def kvNum(k: String, v: Long): String = s""""$k":$v"""

def jArr(items: Seq[String]): String = items.mkString("[", ",", "]")

// ── controllers / endpoints ──────────────────────────────────
val controllerAnnos = Set(
  "RestController", "Controller",
  "RequestMapping", "GetMapping", "PostMapping",
  "PutMapping", "DeleteMapping", "PatchMapping",
)

val controllerNodes = cpg.method.where(_.annotation.name(
  "RequestMapping", "GetMapping", "PostMapping",
  "PutMapping", "DeleteMapping", "PatchMapping",
)).l

val controllers = controllerNodes.map { m =>
  val cls = m.typeDecl.name.headOption.getOrElse("")
  val name = m.name
  val annoNames = m.annotation.name.l
  val httpMethod = annoNames.collectFirst {
    case "GetMapping"    => "GET"
    case "PostMapping"   => "POST"
    case "PutMapping"    => "PUT"
    case "DeleteMapping" => "DELETE"
    case "PatchMapping"  => "PATCH"
    case "RequestMapping"=> "ANY"
  }.getOrElse("ANY")
  val path = m.annotation.parameterAssign.code.l.mkString(",")
  val file = m.filename
  val line = m.lineNumber.getOrElse(0)
  val sig = s"$cls.$name"

  Map(
    "signature" -> sig,
    "cls" -> cls,
    "method" -> name,
    "http_method" -> httpMethod,
    "path" -> path,
    "file" -> file,
    "line" -> line.toString,
  )
}

// ── methods + calls（限制规模避免内存炸） ────────────────────
val MAX_NODES = 10000
val methods = cpg.method.take(MAX_NODES).map { m =>
  Map(
    "signature" -> s"${m.typeDecl.name.headOption.getOrElse("")}.${m.name}",
    "cls" -> m.typeDecl.name.headOption.getOrElse(""),
    "name" -> m.name,
    "file" -> m.filename,
    "line" -> m.lineNumber.getOrElse(0).toString,
  )
}.l

val calls = cpg.call.take(MAX_NODES).map { c =>
  val callerSig = c.method.fullName.headOption.getOrElse("")
  val calleeSig = c.methodFullName
  Map(
    "caller_signature" -> callerSig,
    "callee_signature" -> calleeSig,
  )
}.l

// ── sql_sinks（基于方法名启发式）────────────────────────────
val sqlMethodNames = Set(
  "executeQuery", "executeUpdate", "execute",
  "createQuery", "createNativeQuery",
  "queryForObject", "queryForList", "update",
)
val sqlSinks = cpg.call.name(sqlMethodNames.toSeq: _*).take(MAX_NODES).map { c =>
  val owner = c.method.fullName.headOption.getOrElse("")
  val file = c.method.filename.headOption.getOrElse("")
  val line = c.lineNumber.getOrElse(0)
  val pattern = c.argument.code.l.mkString(" | ")
  val risk = c.argument.code.exists(s => s.contains("+") || s.contains("$"))
  Map(
    "owner_signature" -> owner,
    "file" -> file,
    "line" -> line.toString,
    "sql_pattern" -> pattern,
    "has_injection_risk" -> risk.toString,
    "kind" -> "joern_static",
  )
}.l

// ── 暂不解析 feign_calls / paths（交由 Python 端 call_chain_resolver 补充） ──
val feignCalls: List[Map[String, String]] = Nil
val paths: List[Map[String, String]] = Nil

// ── 序列化 ─────────────────────────────────────────────────
def m2j(m: Map[String, String]): String =
  m.toList.map { case (k, v) => kv(k, v) }.mkString("{", ",", "}")

val sb = new StringBuilder
sb ++= "{\"nodes\":{"
sb ++= s""""endpoints":${jArr(controllers.map(m2j))},"""
sb ++= s""""controllers":${jArr(controllers.map(m2j))},"""
sb ++= s""""methods":${jArr(methods.map(m2j))},"""
sb ++= s""""calls":${jArr(calls.map(m2j))},"""
sb ++= s""""sql_sinks":${jArr(sqlSinks.map(m2j))},"""
sb ++= s""""feign_calls":${jArr(feignCalls.map(m2j))}"""
sb ++= "},"
sb ++= s""""paths":${jArr(paths.map(m2j))}"""
sb ++= "}"

Files.write(Paths.get(outPath), sb.toString.getBytes(StandardCharsets.UTF_8))
println(s"extract_cpg.sc done: $outPath")
